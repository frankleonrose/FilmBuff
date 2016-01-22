'use strict';
/*jslint white: true */
var Immutable = require('immutable');

var actorMovies = require('./generated/actorMovies.json');
var directorMovies = require('./generated/directorMovies.json');
var movies_db = require('./generated/movies.json');
var people = require('./generated/people.json');
var peopleByName = require('./generated/peopleByName.json');

function lookupPersonID(name) {
  if (name) {
    name = name.toLowerCase();
    if (name in peopleByName) {
      return peopleByName[name];
    }
  }
  return null;
}

function getPersonName(person_id) {
  return people[person_id];
}

function getMovieTitle(movie_id) {
  return movies_db[movie_id].title;
}

function lookupMoviesByActor(id) {
  var m = actorMovies[id];
  if (!m) {
    m = [];
  }
  return Immutable.Set(m);
}

function findCommonMovies(id1, id2) {
  var m1 = lookupMoviesByActor(id1);
  var m2 = lookupMoviesByActor(id2);
  var common = m1.intersect(m2);
  var movies = common.toList().map(function (movie_id) { return movies_db[movie_id]; });
  return movies.toJS();
}

module.exports = {
  lookupPersonID: lookupPersonID,
  getPersonName: getPersonName,
  findCommonMovies: findCommonMovies,
  getMovieTitle: getMovieTitle
};
