import Client from '../src/client';
import Options from '../src/options';

describe('Client', function () {
  var client;
  before(() => {
    client = new Client(new Options({
      transport: 'binary',
      host: 'localhost',
      username: 'root',
      password: 'root'
    }));
  });
  describe('::initialize()', function () {
    it('should initialize the client', function () {
      console.log(client);
    });
  });
});