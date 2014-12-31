import Bluebird from 'bluebird';
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

          db.on('metadata', function (metadata) {
            metadata.clusters.length.should.be.above(0);
            metadata.classes.length.should.be.above(0);
            metadata.indices.length.should.be.above(0);
            metadata.clusters.forEach(item => {
              item['@type'].should.equal('orient:Cluster');
            });
            metadata.classes.forEach(item => {
              item['@type'].should.equal('orient:Class');
            });
            metadata.indices.forEach(item => {
              item['@type'].should.equal('orient:Index');
            });
          });

          return Bluebird.all([
            db.exec('CREATE CLASS Location'),
            db.exec('CREATE CLASS Person EXTENDS V'),
            db.exec('CREATE CLASS Knows EXTENDS E')
          ])
          .then(() => db.exec('ALTER DATABASE TIMEZONE UTC'))
          .then(() => {
            return Bluebird.all([
              db.exec('CREATE PROPERTY Person.boolean boolean'),
              db.exec('CREATE PROPERTY Person.integer integer'),
              db.exec('CREATE PROPERTY Person.short short'),
              db.exec('CREATE PROPERTY Person.long long'),
              db.exec('CREATE PROPERTY Person.float float'),
              db.exec('CREATE PROPERTY Person.double double'),
              db.exec('CREATE PROPERTY Person.date date'),
              db.exec('CREATE PROPERTY Person.dateTime datetime'),
              db.exec('CREATE PROPERTY Person.string string'),
              db.exec('CREATE PROPERTY Person.binary binary'),
              db.exec('CREATE PROPERTY Person.byte byte'),
              db.exec('CREATE PROPERTY Person.embedded embedded Location'),
              db.exec('CREATE PROPERTY Person.embeddedList embeddedlist Location'),
              db.exec('CREATE PROPERTY Person.embeddedSet embeddedset Location'),
              db.exec('CREATE PROPERTY Person.embeddedMap embeddedmap Location'),
              db.exec('CREATE PROPERTY Person.link link OUser'),
              db.exec('CREATE PROPERTY Person.linkList linklist OUser'),
              db.exec('CREATE PROPERTY Person.linkSet linkset OUser'),
              db.exec('CREATE PROPERTY Person.linkMap linkmap OUser')
            ]);
          })
          .then(() => {
            return Bluebird.all([
              db.exec('CREATE VERTEX Person SET name = "George"'),
              db.exec('CREATE VERTEX Person SET name = "Alice"'),
              db.exec('\
                CREATE VERTEX Person SET \
                name = "test",\
                boolean = true,\
                integer = 123,\
                short = 456,\
                long = 789,\
                float = 1.23,\
                double = 1.23,\
                date = "2010-10-24",\
                dateTime = "2012-08-13 14:00:00",\
                string = "hello world",\
                link = #5:0,\
                linkList = [#5:0,#5:1],\
                linkMap = {"admin":#5:0,"reader":#5:1},\
                linkSet = [#5:0,#5:1],\
                embedded = {"@type":"d","@class":"Location","address":"123 Fake Street"},\
                embeddedList = [{"@type":"d","@class":"Location","address":"123 Fake Street"},{"@type":"d","@class":"Location","address":"456 Letsbe Avenue"}],\
                embeddedMap = {"foo":{"@type":"d","@class":"Location","address":"123 Fake Street"}},\
                embeddedSet = [{"@type":"d","@class":"Location","address":"123 Fake Street"},{"@type":"d","@class":"Location","address":"456 Letsbe Avenue"}]\
              '.trim())
            ]);
          })
          .then(() => {
            return db.exec('CREATE EDGE Knows FROM (SELECT FROM Person WHERE name = "George") TO (SELECT FROM Person WHERE name = "Alice")');
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

          it('should select a vertex with edges', function () {
            return db.query({
              query: 'SELECT FROM Person WHERE name = "George"',
              fetchPlan: '*:2'
            })
            .then(response => {
              response['@type'].should.equal('orient:ResultSet');
              response['@graph'].length.should.equal(4);
              response['@graph'][0]['@type'].should.equal('orient:Collection');
            });
          });

          it('should select a vertex with a variety of types', function () {
            return db.query({
              query: 'SELECT FROM Person WHERE name = "test"'
            })
            .then(response => {
              response['@type'].should.equal('orient:Collection');
              let record = response['@value'][0]['@value'];
              record.name.should.equal('test');
              record.boolean.should.equal(true);
              record.integer.should.equal(123);
              record.short.should.equal(456);
              record.long.should.equal(789);
              record.float.should.equal(1.23);
              record.double.should.equal(1.23);
              record.date.should.eql(new Date(Date.UTC(2010,9,24)));
              record.dateTime.should.eql(new Date(Date.UTC(2012,7,13, 14)));
              record.string.should.equal("hello world");

              // @fixme when class support is dealt with properly
              //console.log(typeof record.link, record.link);
              //record.link.equals("#5:0").should.be.true;
              /*record.linkList.should.equal([#5:0,#5:1]);
              record.linkMap.should.equal({"admin":#5:0,"reader":#5:1});
              record.linkSet.should.equal([#5:0,#5:1]);
              record.embedded.should.equal({"@type":"d","@class":"Location","address":"123 Fake Street"});
              embeddedList.should.equal([{"@type":"d","@class":"Location","address":"123 Fake Street"},{"@type":"d","@class":"record.Location","address":"456 Letsbe Avenue"}]);
              record.embeddedMap.should.equal({"foo":{"@type":"d","@class":"Location","address":"123 Fake Street"}});
              record.embeddedSet.should.equal([{"@type":"d","@class":"Location","address":"123 Fake Street"},{"@type":"d","@class":"Location","address":"456 Letsbe Avenue"});*/
              //console.log(JSON.stringify(response, null, 2));
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

          it('should delete a document', function () {
            return db.exec({
              query: 'DELETE FROM OUser WHERE name = "charles"'
            })
            .then(response => {
              response['@type'].should.equal('orient:Collection');
              response['@value'].length.should.equal(1);
              response['@value'][0]['@value'].should.equal(1);
            });
          });
        });

        describe('script()', function () {
          it('should execute some javascript', function () {
            return db.script('Javascript', `123;`)
            .then(response => {
              response['@type'].should.equal('orient:Collection');
              response['@value'].length.should.equal(1);
              response['@value'][0]['@value'].should.equal(123);
            });
          });
          it('should execute some SQL', function () {
            return db.script('SQL', `
              LET admin = SELECT FROM OUser WHERE name = 'admin'
              LET reader = SELECT FROM OUser WHERE name = 'reader'
              LET edge = CREATE EDGE E FROM $admin TO $reader SET foo = 'bar'
              RETURN $edge
            `)
            .then(response => {
              response['@type'].should.equal('orient:Collection');
              response['@value'].length.should.equal(1);
              let edge = response['@value'][0];
              edge['@type'].should.equal('db:E');
              edge['@value'].foo.should.equal('bar');
              //edge['@value'].in.should.be.an.instanceOf(RID);
              //edge['@value'].out.should.be.an.instanceOf(RID);
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