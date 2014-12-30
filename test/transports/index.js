import Transports from '../../src/transports';
import {RID} from '../../src/data-types';
import {RequestError, NotImplementedError} from '../../src/errors';


describe('Transports', function () {
  run('binary');
  run('rest');
});

function run (transportName) {
  describe('Transport: ' + transportName, function () {
    let server;
    before(() => {
      server = Transports.create({
        transport: transportName,
        username: 'root',
        password: 'root',
        useToken: false
      });
    });

    describe('Server', function () {
      describe('createDatabase()', function () {
        it('should create a new database', function () {
          return server.createDatabase('test_'+transportName+'_transport', 'memory')
          .then(response => {
            response.should.equal('test_'+transportName+'_transport');
          });
        });
      });
      describe('listDatabases()', function () {
        it('should list the databases on the server', function () {
          return server.listDatabases()
          .then(response => {
            response.should.have.property('test_'+transportName+'_transport');
          });
        });
      });
      describe('hasDatabase()', function () {
        it('should return true for existing databases', function () {
          return server.hasDatabase('test_'+transportName+'_transport')
          .then(response => {
            response.should.be.true;
          });
        });
      });

      describe('freezeDatabase()', function () {
        it('should freeze the database', function () {
          return server.freezeDatabase('test_'+transportName+'_transport')
          .then(result => {
            result.should.be.true;
          })
          .catch(NotImplementedError, e => {});
        });
      });

      describe('releaseDatabase()', function () {
        it('should release the database', function () {
          return server.releaseDatabase('test_'+transportName+'_transport')
          .then(result => {
            result.should.be.true;
          })
          .catch(NotImplementedError, e => {});
        });
      });


      describe('Database', function () {
        let db;
        before(() => {
          db = Transports.create({
            transport: transportName,
            username: 'root',
            password: 'root',
            useToken: false,
            database: 'test_'+transportName+'_transport'
          });
        });

        describe('query()', function () {
          it('should execute a scalar query', function () {
            return db.query({
              query: 'SELECT COUNT(*) FROM OUser'
            })
            .then(response => {
              response['@value'][0]['@value'].COUNT.should.be.above(0);
            });
          });

          it('should execute a query', function () {
            return db.query({
              query: 'SELECT FROM OUser'
            })
            .then(response => {
              response['@type'].should.equal('orient:Collection');
              response['@value'].length.should.be.above(0);
              response['@value'].forEach(result => {
                result['@type'].should.equal('db:OUser');
                Object.keys(result['@value']).length.should.be.above(0);
              });
            });
          });

          it('should execute a query with a fetch plan', function () {
            return db.query({
              query: 'SELECT FROM OUser',
              fetchPlan: 'roles:1'
            })
            .then(response => {
              response['@graph'].length.should.be.above(0);
              response['@graph'].forEach((result, i) => {
                if (i === 0) {
                  result['@type'].should.equal('orient:Collection');
                  result['@value'].length.should.be.above(0);
                  result['@value'].forEach(item => {
                    item.should.be.an.instanceOf(RID);
                  });
                }
                else if (result['@type'] === 'db:OUser') {
                  Object.keys(result['@value']).length.should.be.above(0);
                }
                else if (result['@type'] === 'db:ORole') {
                  Object.keys(result['@value']).length.should.be.above(0);
                }
                else {
                  throw new Error('Should never happen');
                }
              });
            });
          });
        });

        describe('exec()', function () {
          it('should insert a document', function () {
            return db.exec({
              query: 'INSERT INTO OUser SET name = "charles", status = "ACTIVE", password = "no"'
            })
            .then(response => {
              response['@type'].should.equal('orient:Collection');
              response['@value'].length.should.be.above(0);
              response['@value'].forEach(result => {
                result['@type'].should.equal('db:OUser');
                Object.keys(result['@value']).length.should.be.above(0);
              });
            });
          });

          it('should update a document', function () {
            return db.exec({
              query: 'UPDATE OUser SET password = "nope" WHERE name = "charles"'
            })
            .then(response => {
              response['@type'].should.equal('orient:Collection');
              response['@value'].length.should.equal(1);
              response['@value'][0]['@value'].should.equal(1);
            });
          });

        });
      });


      describe('dropDatabase()', function () {
        it('should drop a database', function () {
          return server.dropDatabase('test_'+transportName+'_transport', 'memory')
          .then(response => {
            response.should.be.true;
          });
        });

        it('should fail to drop a database with a name that does not exist', function () {
          let total = 0;
          return server.dropDatabase('test_'+transportName+'_transport', 'memory')
          .then(response => {
            throw new Error('should never happen!');
          })
          .catch(RequestError, (err) => {
            total++;
          })
          .then(() => {
            total.should.equal(1);
          });
        });
      });
    });
  });
}