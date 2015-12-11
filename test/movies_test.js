var assert = require('assert');
var should = require('should');
var movies = require('../lambda/movies')

describe('Movies', function() {
  describe('lookupPersonID', function () {
    it('should failure when unknown actors', function () {
      var pid = movies.lookupPersonID('Murray Hill')
      should.not.exist(pid);
    })
    it('should succeed when known actors', function () {
      var pid = movies.lookupPersonID('John Travolta')
      should.exist(pid);
      var pid = movies.lookupPersonID('Tom Hanks')
      should.exist(pid);
      var pid = movies.lookupPersonID('Julia Roberts')
      should.exist(pid);
    })
  })
  describe('findCommonMovies', function () {
    it('should find no common movies when they don\'t exist', function () {
      var john = movies.lookupPersonID('John Wayne')
      var chaplin = movies.lookupPersonID('Charlie Chaplin')
      var movie_list = movies.findCommonMovies(john, chaplin)
      should.exist(movie_list);
      movie_list.length.should.equal(0)
    })
    it('should find all movies', function () {
      var john = movies.lookupPersonID('John Travolta')
      should.exist(john);
      var uma = movies.lookupPersonID('Uma Thurman')
      should.exist(uma);
      var movie_list = movies.findCommonMovies(john, uma)
      should.exist(movie_list);
      movie_list.length.should.equal(1)
    })
  })
})
