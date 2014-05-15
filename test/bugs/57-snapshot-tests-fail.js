describe('Bug #57 - Tests fail on latest snapshot', function () {
  it('should select an embedded rid bag, record load with a fetch plan', function () {
    var db = TEST_SERVER.use('GratefulDeadConcerts');
    return db.record.get('#9:1', {
      fetchPlan: '*:2'
    })
    .then(function (result) {
      result['@class'].should.equal('V');
    });
  });
  it('should select an embedded rid bag, using an SQL fetch plan', function () {
    var db = TEST_SERVER.use('GratefulDeadConcerts');
    return db.query('SELECT * FROM #9:1 FETCHPLAN *:2')
    .then(function (results) {
      results.length.should.be.above(0);
    });
  });
  it.skip('should select an embedded rid bag, using binary level fetch plan', function () {
    var db = TEST_SERVER.use('GratefulDeadConcerts');
    return db.select().from('#9:1').fetch({'*': 2}).all()
    .then(function (results) {
      // fails
      results.length.should.be.above(0);
    });
  });
});