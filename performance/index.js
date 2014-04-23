'use strict';
/* global before, LIB, TEST_SERVER, TEST_SERVER_CONFIG */

// Test speed
var Promise = require('bluebird');
Promise.longStackTraces();

global.expect = require('expect.js');
global.should = require('should');

global.TEST_SERVER_CONFIG = require('../test/test-server.json');
global.LIB = require('../lib');
global.TEST_SERVER = new LIB.Server(TEST_SERVER_CONFIG);

describe('Query Performance', function() {
  before(function() {
    this.db = TEST_SERVER.use('GratefulDeadConcerts');
  });

  describe('Database::query()', function() {
    var start = new Date().getTime();

    it('should return one record', function() {
      return this.db.query('SELECT FROM V')
        .then(function(records) {
          var end = new Date().getTime();
          var time = end - start;
          console.log(records.length+' record(s) in '+time+' milliseconds');
          Array.isArray(records).should.be.true;
        });
    });
  });
});