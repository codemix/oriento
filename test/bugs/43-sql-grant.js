describe("Bug #43: SQL GRANT with db.exec/db.query", function () {
  before(function () {
    return CREATE_TEST_DB(this, 'testdb_bug_43')
    .bind(this)
    .then(function () {
      return this.db.class.get('ORole');
    })
    .then(function (ORole) {
      return ORole.create({
        name: 'TestRole'
      })
    });
  });
  after(function () {
    return DELETE_TEST_DB('testdb_bug_43');
  });

  it('should execute the grant query and return the results', function () {
    var text = "GRANT NONE ON database.cluster.OUser TO Reader";
    return this.db.exec(text)
    .then(function (result) {
      console.log(result);
    });
  });
});