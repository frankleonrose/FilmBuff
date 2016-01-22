var _ = require('underscore')
var Immutable = require('immutable')
var Async = require('async')
var theMovieDb = require('./themoviedb')
var sprintf = require("sprintf").sprintf
var fs = require('fs');
var mkdirp = require('mkdirp');
var sem = require('semaphore')(2);
var jsonfile = require('jsonfile')
 
var API_KEY = 'cbaac13a0ab933c04725e8b77f160308';

function sem_wrap(cb) {
  return function() {
    var args = arguments; // Store args sent to new cb wrapper
    setTimeout(function() {
      sem.leave();
      cb.apply(this, args); // Pass those args to cb
    }, 500);
  }
}
function downloadMoviePage(year, page, cb) {
  var request = {
    'api_key': API_KEY,
    'primary_release_year': year,
    'page': page,
    'language': 'en'
  };

  //console.log(request);
  sem.take(function() {
    theMovieDb.discover.getMovies(request, 
      sem_wrap(function (json) {
        cb(null, json);
      }),
      sem_wrap(cb));
  });
}

function downloadMovieCredits(movie_id, cb) {
  var request = {
    'api_key': API_KEY,
    'id': movie_id,
  };

  sem.take(function() {
    theMovieDb.movies.getCredits(request, 
      sem_wrap(function (json) {
        cb(null, json);
      }),
      sem_wrap(cb));
  });
}

function withPath(path, cb) {
  if (!fs.existsSync(path)) {
    mkdirp(path, function(err) { 
      if (err) {
        return cb(err);
      }
      return cb();
    });
  }
  else {
    return cb();
  }
}

function downloadMovies(year, pages, cb) {
  //console.log("Downloading movies for year " + year);
  var movie_path = sprintf("data/movies/%04d", year);
  withPath(movie_path, function (err) {
    if (err) {
      console.error("Failed to create path " + movie_path)
      return cb(err);
    }
    var page_list = Immutable.Range(1, pages+1).toList().toJS();
    Async.map(page_list, function(page, pcb) {
      var filename = sprintf("%s/movies-%04d-%04d.json", movie_path, year, page);
      if (!fs.existsSync(filename)) {
        downloadMoviePage(year, page, function(err, json) {
          if (err) {
            console.error("Error downloading movie year " + year + ", page " + page);
            return pcb(err);
          }
          //console.log("Writing movie json " + filename)
          fs.writeFile(filename, json, pcb);
        });
      }
      else {
        //console.log("Exists movie json " + filename)
        return pcb() // Already exists, move on
      }
    }, cb);
  });
}

function forEachJsonInPath(path, fn, cb) {
  fs.readdir(path, function(err, files) {
    if (err) {
      console.error("Error reading directory " + path);
      return cb(err);
    }
    var json_files = _.filter(files, function(f) { return f.indexOf(".json")>-1; })
    Async.map(json_files, function (file, fcb) {
      //console.log(file);
      var op = "reading"
      try {
        var obj = require('../../' + path + '/' + file);
        //console.log(obj);
        op = "processing"
        fn(obj, fcb);
      }
      catch (err) {
        console.error("Error " + op + " file " + file);
        return fcb(err);
      }
    }, cb);
  });
}

function downloadCredits(year, cb) {
  var credit_path = sprintf("data/credits/%04d", year);
  withPath(credit_path, function (err) {
    if (err) {
      console.error("Error making credit path")
      return cb(err);
    }
    // Loop all movies collections in movie_path
    var movie_path = sprintf("data/movies/%04d", year);
    forEachJsonInPath(movie_path, function(movie_batch, mbcb) {
      var movies = movie_batch.results;
      //console.log(movies);
      Async.map(movies, function (movie, mcb) {
        // console.log(movie.original_title);
        if (movie.original_language=="en") {
          var filename = sprintf("%s/movie-%06d-credits.json", credit_path, movie.id);
          if (!fs.existsSync(filename)) {
            downloadMovieCredits(movie.id, function(err, json) {
              if (err) {
                console.error("Error downloading movie credits")
                return mcb(err);
              }
              fs.writeFile(filename, json, mcb);
            });
          }
          else {
            //console.log("Exists: " + filename)
            return mcb() // Already exists, move on
          }
        }
        else {
          //console.log("Non-English: " + filename)
          return mcb() // Already exists, move on
        }
      }, mbcb); // After mapping all movies in batch, call movie batch callback
    }, cb); // After json files, call main callback
  });
}

function fix_name(name) {
  try {
    name = name.replace(/jr\./i,"junior")
    name = name.replace(/[^A-Za-z0-9\s]/g,"")
  }
  catch (err) {
    console.error(err)
    console.error("Name: " + name)
  }
  return name;
}

function main() {
  // Loop through years 1920-2015
  var years = Immutable.Range(1914, 2016)
  years = years.toList().toJS()
  //console.log(years)
  
  var movies = Immutable.Map(); // movie ID --> Movie title
  var people = Immutable.Map(); // ID --> name
  var actorMovies = Immutable.Map(); // person ID --> Set of movie ID's
  var directorMovies = Immutable.Map(); // person ID --> Set of movie ID's
  
  Async.series([
    function (scb) {
      console.log("Downloading movies");
      Async.each(years, function (year, ycb) {
        // Download pages 1-N of movies from each year
        downloadMovies(year, 5, ycb);
      }, scb);
    }
    ,
    function (scb) {
      console.log("Downloading credits");
      // Now download credits for each of the movies...
      Async.each(years, function (year, ycb) {
        downloadCredits(year, ycb);
      }, scb);
    }
    ,
    function (scb) {
      console.log("Generating Actor and Director maps");
      Async.eachSeries(years, function (year, ycb) {
        var credit_path = sprintf("data/credits/%04d", year);
        forEachJsonInPath(credit_path, function(credits, ccb) {
          var movie_id = credits.id;
          //console.log(credits.cast[0]);
          function addPerson(personMovies, person) {
            var pid = person.profile_path
            if (!pid) {
              return personMovies
            }
            if (pid=="/nuwf9rzGlmKjVUMVi8B9pT1h06F.jpg") {
              console.log(movie_id);
            }
            people = people.set(pid, person.name);
            if (personMovies.has(pid)) {
              return personMovies.update(pid, function (movies) { return movies.add(movie_id); });
            }
            else {
              return personMovies.set(pid, Immutable.Set().add(movie_id));
            }
          } 
          actorMovies = Immutable.List(credits.cast).reduce(addPerson, actorMovies);
          directorMovies = Immutable.List(credits.crew)
            .filter(function (person) { return person.job=="Director";})
            .reduce(addPerson, directorMovies);
          return ccb();
        }, ycb);
      }, scb);
    }
    ,
    function (scb) {
      console.log("Generating Movie map");
      Async.each(years, function (year, ycb) {
        var movie_path = sprintf("data/movies/%04d", year);
        forEachJsonInPath(movie_path, function(movie_batch, mbcb) {
          //console.log(credits.cast[0]);
          Immutable.List(movie_batch.results).forEach(function (movie) {
            movies = movies.set(movie.id, {id:movie.id, title:movie.original_title, release_date:movie.release_date})
          });
          return mbcb();
        }, ycb);
      }, scb);
    }
    ,
    function (scb) {
      console.log("Movies: " + movies.size);
      console.log("People: " + people.size);
      var path = 'src/generated/'
      var peopleByName = people.map(fix_name).map(function(name) { return name.toLowerCase(); }).flip()
      var files = {
        movies, people, actorMovies, directorMovies, peopleByName
      }

      Async.each(Object.keys(files), function (file, fcb) {
        var data = files[file]
        jsonfile.writeFile(path + file + ".json", data.toJS(), fcb)
      }, scb);
    }
    ,
    function (scb) {
      console.log("Generating name list");
      var path = 'speechAssets/customSlotTypes/'
      withPath(path, function (err) {
        if (err) {
          console.error("Error making speechAssets path")
          return cb(err);
        }
        var peopleMovies = directorMovies.reduce(function (r, v, k) {
          if (r.has(k)) {
            v = r.get(k).union(v) // Merge acting roles with directing roles for this person
          }
          return r.set(k, v)
        }, actorMovies);
        var topPeople = peopleMovies.sort(function (a, b) { return b.size - a.size; }).take(5000)
        var names = Immutable.List(topPeople.keys()).map(function(k) { return people.get(k); }).toSet()
        
        var text_names = names.map(fix_name).reduce(function (r, v) {
          if (v) {
            return r + v + "\n";
          }
          else {
            return r;
          }}, "")
        fs.writeFile(path + "ACTORNAME", text_names, scb);
      });
    }
  ],
    function (err) {
      if (err) {
        return console.error(err);
      }
      console.log("Completed")
    });
}

main();

// {
//   "poster_path":"\/enqVwbUu6OX5LHq0fuk7sLT35zy.jpg",
//   "adult":false,
//   "overview":"A bored and domesticated Shrek pacts with deal-maker Rumpelstiltskin to get back to feeling like a real ogre again, but when he's duped and sent to a twisted version of Far Far Away—where Rumpelstiltskin is king, ogres are hunted, and he and Fiona have never met—he sets out to restore his world and reclaim his true love.",
//   "release_date":"2010-05-16",
//   "genre_ids":[35,12,14,16,10751],
//   "id":10192,
//   "original_title":"Shrek Forever After",
//   "original_language":"en",
//   "title":"Shrek Forever After",
//   "backdrop_path":"\/aD8iOuLlEiMfVlHTnAe15fZLo0S.jpg",
//   "popularity":3.149088,
//   "vote_count":843,
//   "video":false,
//   "vote_average":5.94
// }

single_request = {
  'api_key': API_KEY,
  'id': 45269,
};
