var assert = require('assert');
var lambda = require('../lambda/lambda')

describe('Lambda', function() {
  describe('searchTwoActors', function () {
    it('should fail when unknown actors', function () {
      lambda.searchTwoActors({ slots: {ActorOne:{value: 'Murray Hill'}, ActorTwo: {value: "Emily Litella"}}},
                                  {session: 1}, function (attribs, response) {

      assert.equal("Sorry, I didn't recognize those actors.", response.outputSpeech.text);
      });
    });
    it('should succeed when known actors', function () {
      lambda.searchTwoActors({ slots: {ActorOne:{value: 'John Travolta'}, ActorTwo: {value: "Uma Thurman"}}},
                                  {session: 1}, function (attribs, response) {

      assert.equal("That movie was Pulp Fiction", response.outputSpeech.text);
      });
    });
    it('should succeed when known actors reversed', function () {
      lambda.searchTwoActors({ slots: {ActorOne:{value: 'Uma Thurman'}, ActorTwo: {value: "John Travolta"}}},
                                  {session: 1}, function (attribs, response) {

      assert.equal("That movie was Pulp Fiction", response.outputSpeech.text);
      });
    });
    it('should succeed when known actors lower case', function () {
      lambda.searchTwoActors({ slots: {ActorOne:{value: 'uma thurman'}, ActorTwo: {value: "john travolta"}}},
                                  {session: 1}, function (attribs, response) {

      assert.equal("That movie was Pulp Fiction", response.outputSpeech.text);
      });
    });
  });
})