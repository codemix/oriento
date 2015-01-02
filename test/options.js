import Options from '../src/options';

describe('Options', function () {
  it('properties should be immutable', function () {
    let options = new Options('remote:localhost');
    try {
      options.host = 'nope';
      throw new Error('should never happen.');
    }
    catch (e) {
      e.should.be.an.instanceof(TypeError);
    }
  });
  describe('::constructor(options:String)', function () {
    describe('binary transport', function () {
      it('server', function () {
        let options = new Options('remote:localhost');
        options.should.have.properties({
          transport: 'remote',
          host: 'localhost'
        });
      });
      it('server, with port', function () {
        let options = new Options('remote:localhost:2424');
        options.should.have.properties({
          transport: 'remote',
          host: 'localhost',
          port: 2424
        });
      });

      it('server, with port + auth', function () {
        let options = new Options('remote:foo:bar@localhost:2424');
        options.should.have.properties({
          transport: 'remote',
          host: 'localhost',
          port: 2424,
          username: 'foo',
          password: 'bar'
        });
      });

      it('database', function () {
        let options = new Options('remote:localhost/mydb');
        options.should.have.properties({
          transport: 'remote',
          host: 'localhost',
          database: 'mydb'
        });
      });
      it('database, with port', function () {
        let options = new Options('remote:localhost:2424/mydb');
        options.should.have.properties({
          transport: 'remote',
          host: 'localhost',
          database: 'mydb',
          port: 2424
        });
      });

      it('database, with port + auth', function () {
        let options = new Options('remote:foo:bar@localhost:2424/mydb');
        options.should.have.properties({
          transport: 'remote',
          host: 'localhost',
          database: 'mydb',
          port: 2424,
          username: 'foo',
          password: 'bar'
        });
      });
    });
    describe('HTTP REST transport', function () {
      it('server', function () {
        let options = new Options('http://localhost');
        options.should.have.properties({
          transport: 'http',
          host: 'localhost'
        });
      });
      it('server, with port', function () {
        let options = new Options('http://localhost:2424');
        options.should.have.properties({
          transport: 'http',
          host: 'localhost',
          port: 2424
        });
      });

      it('server, with port + auth', function () {
        let options = new Options('http://foo:bar@localhost:2424');
        options.should.have.properties({
          transport: 'http',
          host: 'localhost',
          port: 2424,
          username: 'foo',
          password: 'bar'
        });
      });

      it('database', function () {
        let options = new Options('http://localhost/mydb');
        options.should.have.properties({
          transport: 'http',
          host: 'localhost',
          database: 'mydb'
        });
      });
      it('database, with port', function () {
        let options = new Options('http://localhost:2424/mydb');
        options.should.have.properties({
          transport: 'http',
          host: 'localhost',
          database: 'mydb',
          port: 2424
        });
      });

      it('database, with port + auth', function () {
        let options = new Options('http://foo:bar@localhost:2424/mydb');
        options.should.have.properties({
          transport: 'http',
          host: 'localhost',
          database: 'mydb',
          port: 2424,
          username: 'foo',
          password: 'bar'
        });
      });
    });
  });
  describe('::constructor(options:Object)', function () {
    it('should initialize based on an object', function () {
      let options = new Options({
        transport: 'http',
        host: 'localhost',
        database: 'mydb',
        port: 2424,
        username: 'foo',
        password: 'bar'
      });
      options.should.have.properties({
        transport: 'http',
        host: 'localhost',
        database: 'mydb',
        port: 2424,
        username: 'foo',
        password: 'bar'
      });
    });
  });
});