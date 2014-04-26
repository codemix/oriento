'use strict';
/* global before, after, CREATE_TEST_DB, DELETE_TEST_DB */

describe('Bug #25: Create undefined in Myclass.property.create', function () {
  before(function () {
    var self = this;

    return CREATE_TEST_DB(self, 'testdb_bug_25')
      .then(function () {
        return self.db.class.create('Member', 'V');
      })
      .then(function (item) {
        self.class = item;
      });
  });

  after(function () {
    return DELETE_TEST_DB('testdb_bug_25');
  });

  it('Let me create a property immediately after creating a class', function () {
    var values = {
      name: 'name',
      type: 'String',
      mandatory: true,
      max: 65
    };
    return this.class.property.create(values)
      .then(function (prop) {
        prop.should.have.properties(values);
      });
  });
});