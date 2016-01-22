var should = require('should');
var Immutable = require('immutable')
var lambda = require('../lambda/lambda')

var UMA_ID = '/nuwf9rzGlmKjVUMVi8B9pT1h06F.jpg'
var JOHN_ID = '/ns8uZHEHzV18ifqA9secv8c2Ard.jpg'

describe('deciders', function() {
  describe('main decide', function () {
    it('should respond to launch with welcome', function () {
      plan = lambda.test.decide(Immutable.Map(), {name: "INTERNAL.Launch"})
      plan.should.eql(["say_welcome", "prompt_two", "forget_actor"]);
    });
    it('should respond to session ended', function () {
      plan = lambda.test.decide(Immutable.Map(), {name: "INTERNAL.Ended"})
      plan.should.eql(["end_session"]);
    });
    it('should respond to help with help text', function () {
      plan = lambda.test.decide(Immutable.Map(), {name: "AMAZON.HelpIntent"})
      plan.should.eql(["say_help"]);
    });
  });
  
  describe('decideOneActor', function () {
    it('should fail when unknown actor', function () {
      plan = lambda.test.decideOneActor(Immutable.Map(), 'Emily Litella')
      plan.should.eql(["unknown_actor", 'prompt_two']);
    });
    it('should prompt for second when unknown actor but one stored', function () {
      plan = lambda.test.decideOneActor(Immutable.Map({actor: UMA_ID}), 'Emily Litella')
      plan.should.eql(["unknown_actor", ['prompt_second', UMA_ID]]);
    });
    it('should prompt for other actor after recognizing one', function () {
      plan = lambda.test.decideOneActor(Immutable.Map(), 'Uma Thurman')
      plan.should.eql([['prompt_second', UMA_ID]]);
    });
    it('should succeed with known and one stored', function () {
      plan = lambda.test.decideOneActor(Immutable.Map({actor: UMA_ID}), 'John Travolta')
      plan.should.eql([
        ['store_question', UMA_ID, JOHN_ID],
        ['answer_movies', 680], 'end_session']);
    });
  });
  
  describe('decideTwoActors', function () {
    it('should fail when unknown actors', function () {
      plan = lambda.test.decideTwoActors('Murray Hill', 'Emily Litella')
      plan.should.eql(['neither_known', 'prompt_two']);
    });
    it('should prompt for unrecognized one of two actors', function () {
      plan = lambda.test.decideTwoActors('Murray Hill', 'Uma Thurman')
      plan.should.eql([
        ['did_not_catch', 1],
        ['prompt_second', UMA_ID]]);
    });
    it('should prompt for unrecognized one of two actors', function () {
      plan = lambda.test.decideTwoActors('John Travolta', 'Emily Litella')
      plan.should.eql([
        ['did_not_catch', 2],
        ['prompt_second', JOHN_ID]]);
    });
    it('should succeed when known actors', function () {
      plan = lambda.test.decideTwoActors('John Travolta', 'Uma Thurman')
      plan.should.eql([
        ['store_question', JOHN_ID, UMA_ID],
        ['answer_movies', 680], 'end_session']);
    });
    it('should succeed when known actors reversed', function () {
      plan = lambda.test.decideTwoActors('Uma Thurman', 'John Travolta')
      plan.should.eql([
        ['store_question', UMA_ID, JOHN_ID],
        ['answer_movies', 680], 'end_session']);
    });
    it('should succeed when known actors lower case', function () {
      plan = lambda.test.decideTwoActors('uma thurman', 'john travolta')
      plan.should.eql([
        ['store_question', UMA_ID, JOHN_ID],
        ['answer_movies', 680], 'end_session']);
    });
  })
})

describe('update', function () {
  it('should set actor on prompt_second', function () {
    state = lambda.test.update(Immutable.Map(), [['prompt_second', JOHN_ID]])
    state.toJS().should.eql({actor: JOHN_ID});
  });
  it('should delete actor on forget_actor', function () {
    state = lambda.test.update(Immutable.Map({actor: JOHN_ID}), ['forget_actor'])
    state.toJS().should.eql({});
  });
  it('should store question to empty history', function () {
    state = lambda.test.update(Immutable.Map(), 
      [['store_question', UMA_ID, JOHN_ID], "end_session"])
    state.toJS().should.eql({history: [[UMA_ID, JOHN_ID]]});
  });
  it('should store question to populated history', function () {
    state = lambda.test.update(Immutable.Map({history: Immutable.List([Immutable.List([UMA_ID, JOHN_ID])])}), 
      [['store_question', UMA_ID + "x", JOHN_ID + "x"], "end_session"])
    state.toJS().should.eql({history: [[UMA_ID, JOHN_ID], [UMA_ID + "x", JOHN_ID + "x"]]});
  });
  it('should not change state with most plans', function () {
    state = lambda.test.update(Immutable.Map({actor: UMA_ID, history: Immutable.List()}), 
      ["say_welcome", "say_help", "answer_movies", "neither_known", "unknown_actor", "did_not_catch",
       "unknown_movie", "same_actor", "prompt_two"])
    state.toJS().should.eql({actor: UMA_ID, history: []});
  });
});
 
describe('speak', function () {
  it('should end on end_session', function () {
    speechlet = lambda.test.speak(['end_session']);
    speechlet.shouldEndSession.should.eql(true);
  });
  it('should produce welcome speech', function () {
    speechlet = lambda.test.speak(['say_welcome'])
    speechlet.output.should.eql(lambda.test.getWelcomeSpeech().output);
  });
  it('should produce help speech', function () {
    speechlet = lambda.test.speak(['say_help'])
    speechlet.output.should.eql(lambda.test.getHelpSpeech().output);
  });
  it('should produce neither_known speech', function () {
    speechlet = lambda.test.speak(['neither_known'])
    speechlet.output.should.eql("I don't recognize either of those actors.");
  });
  it('should produce unknown_actor speech', function () {
    speechlet = lambda.test.speak(['unknown_actor'])
    speechlet.output.should.eql("I don't recognize that actor.");
  });
  it('should produce did_not_catch speech', function () {
    speechlet = lambda.test.speak([['did_not_catch', 1]])
    speechlet.output.should.eql("I don't recognize that first actor.");
    speechlet = lambda.test.speak([['did_not_catch', 2]])
    speechlet.output.should.eql("I don't recognize that second actor.");
  });
  it('should produce unknown_movie speech', function () {
    speechlet = lambda.test.speak(['unknown_movie'])
    speechlet.output.should.eql("I don't know a movie they were both in.");
  });
  it('should produce same_actor speech', function () {
    speechlet = lambda.test.speak(['same_actor'])
    speechlet.output.should.eql("That's the same actor twice.");
  });
  it('should produce prompt_two speech', function () {
    speechlet = lambda.test.speak(['prompt_two'])
    speechlet.output.should.eql("Ask what films two actors were in.");
  });
  it('should produce prompt_second speech', function () {
    speechlet = lambda.test.speak([['prompt_second', UMA_ID]])
    speechlet.output.should.eql("Uma Thurman and who else?");
  });
  it('should produce prompt_two speech', function () {
    speechlet = lambda.test.speak(['prompt_two'])
    speechlet.output.should.eql("Ask what films two actors were in.");
  });
  
  it('should pronounce a single movie', function () {
    speechlet = lambda.test.speak([['answer_movies', 680]])
    speechlet.output.should.eql('That movie was Pulp Fiction.');
  });
  it('should pronounce two movies', function () {
    speechlet = lambda.test.speak([['answer_movies', 680, 702]])
    speechlet.output.should.eql('They were in Pulp Fiction and A Streetcar Named Desire');
  });
  it('should pronounce three movies', function () {
    speechlet = lambda.test.speak([['answer_movies', 680, 702, 227]])
    speechlet.output.should.eql('They were in Pulp Fiction and A Streetcar Named Desire and The Outsiders');
  });
  it('should pronounce three+ movies', function () {
    speechlet = lambda.test.speak([['answer_movies', 680, 702, 227, 240]])
    speechlet.output.should.eql('They were in Pulp Fiction and A Streetcar Named Desire and 2 others.');
  });
});

describe('combineSpeech', function () {
  it('should merge output', function () {
    s1 = {output: "Text 1."}
    s2 = {output: null}
    output = lambda.test.combineSpeech(s1, s2)
    output.should.eql({output: "Text 1.", reprompt: null, title: null, shouldEndSession: false});
    s1 = {output: null}
    s2 = {output: "Text 2."}
    output = lambda.test.combineSpeech(s1, s2)
    output.should.eql({output: "Text 2.", reprompt: null, title: null, shouldEndSession: false});
    s1 = {output: "Text 1."}
    s2 = {output: "Text 2."}
    output = lambda.test.combineSpeech(s1, s2)
    output.should.eql({output: "Text 1. Text 2.", reprompt: null, title: null, shouldEndSession: false});
  });
  it('should pick the first title', function () {
    s1 = {title: "First", output: "Text 1."}
    s2 = {title: "Second", output: "Text 2."}
    output = lambda.test.combineSpeech(s1, s2)
    output.should.eql({output: "Text 1. Text 2.", reprompt: null, title: "First", shouldEndSession: false});
  });
  it('should merge reprompts', function () {
    s1 = {reprompt: "Text 1."}
    s2 = {reprompt: null}
    output = lambda.test.combineSpeech(s1, s2)
    output.should.eql({reprompt: "Text 1.", output: null, title: null, shouldEndSession: false});
    s1 = {reprompt: null}
    s2 = {reprompt: "Text 2."}
    output = lambda.test.combineSpeech(s1, s2)
    output.should.eql({reprompt: "Text 2.", output: null, title: null, shouldEndSession: false});
    s1 = {reprompt: "Text 1."}
    s2 = {reprompt: "Text 2."}
    output = lambda.test.combineSpeech(s1, s2)
    output.should.eql({reprompt: "Text 1. Text 2.", output: null, title: null, shouldEndSession: false});
  });
  it('should or together end session flags', function () {
    for (var x in [false, true, null]) {
      for (var y in [false, true, null]) {
        s1 = {shouldEndSession: x}
        s2 = {shouldEndSession: y}
        output = lambda.test.combineSpeech(s1, s2)
        output.should.eql({reprompt: null, output: null, title: null, shouldEndSession: (x || y || false)});
      }
    }
  });
});

