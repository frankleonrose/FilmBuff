'use strict';
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * Rather than using intents as the primary factoring of functions, we use state and plans.
 */
/*jslint white: true */

var AWS = require("aws-sdk");
var Immutable = require('immutable');
var Promise = require('bluebird');
var movies = require('./movies');

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
  var speechlet = {
    outputSpeech: {
      type: "PlainText",
      text: output
    },
    shouldEndSession: shouldEndSession
  };
  
  if (repromptText) {
    speechlet.reprompt = {
      outputSpeech: {
        type: "PlainText",
        text: repromptText
      }
    };
  }
  
  if (title) {
    speechlet.card = {
      type: "Simple",
      title: title,
      content: output
    };
  }
  
  return speechlet;
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

// --------------- Storage -----------------------

var FILM_BUFF_BUCKET = "com.futurose.filmbuff";

function loadS3(id) {
  return new Promise(function (resolve, reject) {
    var s3 = new AWS.S3();
    var params = {"Bucket": FILM_BUFF_BUCKET, "Key": id};
    s3.getObject(params, function (err, response) {
      if (err) {
        reject(err);
      }
      else {
        var state = JSON.parse(response.Body);
        resolve(state);
      }
    });
  });
}

function storeS3(id, state) {
  return new Promise(function (resolve, reject) {
    state = JSON.stringify(state);
    var s3 = new AWS.S3();
    var params = {"Bucket": FILM_BUFF_BUCKET, "Key": id, "Body": state};
    s3.putObject(params, function (err) {
      if (err) {
        reject(err);
      }
      else {
        resolve(true);
      }
    });
  });
}

var productionStorage = {
  load: loadS3,
  store: storeS3
};

function recover(session, loader, defaultState) {
  console.assert(session, "recover requires a session")
  console.assert(defaultState, "recover requires a defaultState")
  if (session.new) {
    return loader(session.user.userId).catch( function (err) {
      console.error("Failed to load state for user ID: '" + session.user.userId + "'");
      console.error(err);
      return Promise.resolve(defaultState);
    });
  }
  else {
    var state = session.attributes;
    if (!state) {
      state = defaultState;
    }
    return Promise.resolve(state);
  }
}

// --------------- Deciders -----------------------

function decideTwoActorsById(id1, id2) {
  if (!id1 && !id2) {
    return ["neither_known", "prompt_two"];
  }
  else if (!id1) {
    return [["did_not_catch", 1], ["prompt_second", id2]];
  }
  else if (!id2) {
    return [["did_not_catch", 2], ["prompt_second", id1]];
  }
  else if (id1===id2) {
    return ["same_actor", ["prompt_second", id1]];
  }
    
  var common = movies.findCommonMovies(id1, id2);
  if (common && common.length>0) {
    return [["store_question", id1, id2], ["answer_movies"].concat(common.map(function (x) { return x.id; })), "end_session"];
  }
  else {
    return ["unknown_movie", "end_session"];
  }
}

function decideTwoActors(actor1, actor2) {
  var id1 = movies.lookupPersonID(actor1);
  var id2 = movies.lookupPersonID(actor2);
  return decideTwoActorsById(id1, id2);
}

function decideOneActor(state, actor1) {
  var id1 = movies.lookupPersonID(actor1);
  
  if (!id1) {
    var prompt = state.has("actor") ? ["prompt_second", state.get("actor")] : "prompt_two";
    return ["unknown_actor", prompt];
  }
  else {
    if (state.has("actor")) {
      var id0 = state.get("actor");
      return decideTwoActorsById(id0, id1);
    }
    else {
      return [["prompt_second", id1]];
    }
  }
}

function decide(state, intent) {
  // Note: state.stored will be set to a Date if we just recovered from storage.
  // TODO: Maybe it was within 5 minutes and we should resume some operation.
  // TODO: Or it was from a few weeks ago and we want to give a big welcome back.
  switch (intent.name) {

    case "INTERNAL.Launch": 
      return ["say_welcome", "prompt_two", "forget_actor"];

    case "INTERNAL.Ended":
      return ["end_session"];

    case "OneActor":
      var actor1 = intent.slots.ActorOne.value;
      return decideOneActor(state, actor1);

    case "TwoActors":
      var actor1 = intent.slots.ActorOne.value;
      var actor2 = intent.slots.ActorTwo.value;
      return decideTwoActors(actor1, actor2);

    case "AMAZON.HelpIntent":
      return ["say_help"];

    default:
      return [["error"], "Unknown intent '" + intent.name + "'"];
  }
}

// --------------- Update State -----------------------

function getOpcode(op) {
  if (op instanceof Array) {
    return op[0];
  }
  else {
    return op;
  }
}

function update(state, plan) {
  console.assert(state /*instanceof Immutable.Map*/, "update takes a state Map");
  console.assert(plan instanceof Array, "update takes a plan Array");
  return plan.reduce(function (s, op) {
    var opcode = getOpcode(op);
    switch (opcode) {
      case "prompt_second":
        s = s.set("actor", op[1]);
        break;
      case "store_question":
        s = s.update("history", Immutable.List(), function (h) {
          h = h.push(Immutable.List.of(op[1], op[2]));
          return h;
        });
        break;
      case "forget_actor":
      case "end_session":
        s = s.delete("actor");
        break;
      default:
        // Do nothing. Most plan ops don't affect state
        break;
    }
    return s;
  }, state);
}

// --------------- Speak -----------------------

function combineString(s1, s2) {
  if (s1 && !s2) {
    return s1;
  }
  else if (!s1 && s2) {
    return s2;
  }
  else if (!s1 && !s2) {
    return null; // undefined
  }
  else {
    return s1 + " " + s2;
  }
}

function combineSpeech(sp1, sp2) {
  return {
    title: sp1.title || sp2.title || null,
    output: combineString(sp1.output, sp2.output),
    reprompt: combineString(sp1.reprompt, sp2.reprompt),
    shouldEndSession: sp1.shouldEndSession || sp2.shouldEndSession || false
  };
}

function getWelcomeSpeech() {
  return {
    title: "Welcome",
    output: "Welcome to Film Buff. " +
      "I can tell you which film two actors were in together. " + 
      "Everything I know about thousands of films and actors I learned from The Movie Database at the movie d b dot com.",
    reprompt: "Ask me what film starred both Uma Thurman and John Travolta.",
    shouldEndSession: false
  };
}

function getHelpSpeech() {
  return {
    output: "Ask Film Buff what film starred actor one and actor two.",
    shouldEndSession: false
  };
}

function getMoviesSpeech(movieIds) {
  var speechOutput = null;
  if (movieIds.length===1) {
    speechOutput = "That movie was " + movies.getMovieTitle(movieIds[0]) + ".";
  }
  else {
    speechOutput = "They were in " + movies.getMovieTitle(movieIds[0]) + " and " + movies.getMovieTitle(movieIds[1]);
    if (movieIds.length===3) {
      speechOutput += " and " + movies.getMovieTitle(movieIds[2]);
    }
    else if (movieIds.length>3) {
      speechOutput += " and " + (movieIds.length-2) + " others.";
    }
  }
  return {
    output: speechOutput
  };
}

function speak(plan) {
  return plan.reduce(function (speech, op) {
    var opcode = getOpcode(op);
    var sp = null;
    switch (opcode) {
      case "say_welcome":
        sp = getWelcomeSpeech();
        break;
      case "say_help":
        sp = getHelpSpeech();
        break;
      case "answer_movies":
        sp = getMoviesSpeech(op.slice(1));
        break;
      case "neither_known":
        sp = {output: "I don't recognize either of those actors."};
        break;
      case "unknown_actor":
        sp = {output: "I don't recognize that actor."};
        break;
      case "did_not_catch":
        var which = op[1]===1 ? "first" : "second";
        sp = {output: "I don't recognize that " + which + " actor."};
        break;
      case "unknown_movie":
        sp = {output: "I don't know a movie they were both in."};
        break;
      case "same_actor":
        sp = {output: "That's the same actor twice."};
        break;
      case "prompt_two":
        sp = {output: "Ask what films two actors were in."};
        break;
      case "prompt_second":
        sp = {output: movies.getPersonName(op[1]) + " and who else?"};
        break;
      case "end_session":
        sp = {shouldEndSession: true};
        break;
      default:
        // Do nothing. Often plan ops don't produce output.
    }
    if (sp) {
      speech = combineSpeech(speech, sp);
    }
    return speech;
  }, {});
}

exports.handler = function (event, context, storage) {
  // if (event.session.application.applicationId !== "arn:aws:lambda:us-east-1:425789076871:function:FilmBuff") {
  //      context.fail("Invalid Application ID");
  // }

  var intent = event.request.intent;
  if (event.request.type === "LaunchRequest") {
    intent = {name: "INTERNAL.Launch"};
  }
  else if (event.request.type === "SessionEndedRequest") {
    intent = {name: "INTERNAL.Ended"};
  }

  if (!storage) {
    storage = productionStorage; // Not testing. Use production loader.
  }

  try {
    var defaultState = {created: new Date()};
    recover(event.session, storage.load, defaultState)
      .then( function (jsstate) {
        var state = Immutable.fromJS(jsstate);

        var plan = decide(state, intent);
        state = update(state, plan);
        var speech = speak(plan);
      
        var finish = function () {
          state = state.delete("stored"); // Stored should not come back in session
          var speechlet = buildSpeechletResponse(speech.title, speech.output, speech.reprompt, speech.shouldEndSession);
          context.succeed(buildResponse(state.toJS(), speechlet));
        };
        if (speech.shouldEndSession && storage.store) {
          state = state.set("stored", new Date()); // Record when stored
          storage.store(event.session.user.userId, state.toJS()).then(finish).catch( function (err) {
            console.error("Failed to store state for id: '" + event.session.user.userId + "'.");
            console.error(err);
            finish(); // Log error, but don't change output.
          });
        }
        else {
          finish();
        }
      })
    .catch( function (err) {
      context.fail("Exception: " + err);
    });
  }
  catch (e) {
      context.fail("Exception: " + e);
  }
};

module.exports.test = {
  decide: decide,
  update: update,
  speak: speak,
  decideOneActor: decideOneActor,
  decideTwoActors: decideTwoActors,
  combineSpeech: combineSpeech,
  getWelcomeSpeech: getWelcomeSpeech,
  getHelpSpeech: getHelpSpeech,
  getMoviesSpeech: getMoviesSpeech
};
