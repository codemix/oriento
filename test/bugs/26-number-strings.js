'use strict';
/* global before, after, CREATE_TEST_DB, DELETE_TEST_DB */

describe('Bug #26: Issue while adding IP as a value to a Vertex', function () {
  before(function () {
    var self = this;

    return CREATE_TEST_DB(self, 'testdb_bug_26')
      .then(function () {
        return self.db.class.create('Host');
      })
      .then(function (item) {
        self.class = item;
      });
  });

  after(function () {
    return DELETE_TEST_DB('testdb_bug_26');
  });

  it('should insert an IP into the database, using a dynamic field', function () {
    return this.db.insert().into('Host').set({ip: '127.0.0.1'}).one()
      .then(function (host) {
        host.ip.should.equal('127.0.0.1');
      });
  });
});