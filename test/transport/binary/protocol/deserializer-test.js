var serializer = LIB.transport.BinaryTransport.protocol.serializer,
    deserializer = LIB.transport.BinaryTransport.protocol.deserializer,
    recordParser = LIB.transport.BinaryTransport.protocol.recordParser,
    newDeserializer = require(LIB_ROOT + '/transport/binary/protocol/new-deserializer');

describe('Binary Deserializer', function () {

  var LIMIT = 1000;

  before(function () {
    this.record = {
      '@class': 'OUser',
      '@type': 'd',
      name: 'admin',
      password: '12345678910',
      status: 'ACTIVE',
      int: 1234,
      float: 1234.567,
      bool: true,
      a: [1, 2, 3],
      roles: []
    };

    this.deep = {
      '@class': 'OUser',
      '@type': 'd',
      name: 'reader',
      password: 'reader',
      status: 'ACTIVE',
      roles: []
    };


    for (var i = 0; i < LIMIT; i++) {
      this.deep.roles.push({
        '@class': 'ORole',
        '@type': 'd',
        name: 'role' + i,
        string: 'my string',
        numberString: '123 fake street'
      });
    }


    this.serializedRecord = serializer.serializeDocument(this.record);
    this.serializedDeep = serializer.serializeDocument(this.deep);

  });

  it('should parse a record', function () {
    var deserialized = deserializer.deserializeDocument(this.serializedRecord);
    deserialized.should.eql(this.record);
  });

  it('should parse a deeply nested record', function () {
    var deserialized = deserializer.deserializeDocument(this.serializedDeep);
    deserialized.should.eql(this.deep);
  });


  it('should parse a record, using PEG', function () {
    var deserialized = recordParser.parse(this.serializedRecord);
    deserialized.should.eql(this.record);
  });

  it('should parse a deeply nested record, using PEG', function () {
    var deserialized = recordParser.parse(this.serializedDeep);
    deserialized.should.eql(this.deep);
  });

  it('should parse a record, using the new deserializer', function () {
    var deserialized = newDeserializer.deserialize(this.serializedRecord);
    deserialized.should.eql(this.record);
  });

  it('should parse a deeply nested record, using the new deserializer', function () {
    var deserialized = newDeserializer.deserialize(this.serializedDeep);
    deserialized.should.eql(this.deep);
  });

  it('should parse individual records quickly', function () {
    var limit = 1000,
        size = this.serializedRecord.length * limit,
        start = Date.now();

    for (var i = 0; i < limit; i++) {
      deserializer.deserializeDocument(this.serializedRecord);
    }

    var stop = Date.now(),
        total = (stop - start) / 1000;

    console.log('Done in ' + total + 's, ', (limit / total).toFixed(3), 'documents / sec', (((size / total) / 1024) / 1024).toFixed(3), ' Mb / sec')

  });

   it('should parse individual records quickly, using PEG', function () {
    var limit = 1000,
        size = this.serializedRecord.length * limit,
        start = Date.now();

    for (var i = 0; i < limit; i++) {
      recordParser.parse(this.serializedRecord);
    }

    var stop = Date.now(),
        total = (stop - start) / 1000;

    console.log('PEG Done in ' + total + 's, ', (limit / total).toFixed(3), 'documents / sec', (((size / total) / 1024) / 1024).toFixed(3), ' Mb / sec')

  });

  it('should parse individual records quickly, using the new deserializer', function () {
    var limit = 1000,
        size = this.serializedRecord.length * limit,
        start = Date.now();

    for (var i = 0; i < limit; i++) {
      newDeserializer.deserialize(this.serializedRecord);
    }

    var stop = Date.now(),
        total = (stop - start) / 1000;

    console.log('New Deserializer Done in ' + total + 's, ', (limit / total).toFixed(3), 'documents / sec', (((size / total) / 1024) / 1024).toFixed(3), ' Mb / sec')

  });

  it('should parse large nested records quickly', function () {
    var limit = 100,
        size = this.serializedDeep.length * limit,
        start = Date.now();

    for (var i = 0; i < limit; i++) {
      deserializer.deserializeDocument(this.serializedDeep);
    }

    var stop = Date.now(),
        total = (stop - start) / 1000;

    console.log('Done in ' + total + 's, ', (limit / total).toFixed(3), 'documents / sec', (((size / total) / 1024) / 1024).toFixed(3), ' Mb / sec')

  });

  it('should parse large nested records quickly, using PEG', function () {
    var limit = 100,
        size = this.serializedDeep.length * limit,
        start = Date.now();

    for (var i = 0; i < limit; i++) {
      recordParser.parse(this.serializedDeep);
    }

    var stop = Date.now(),
        total = (stop - start) / 1000;

    console.log('PEG Done in ' + total + 's, ', (limit / total).toFixed(3), 'documents / sec', (((size / total) / 1024) / 1024).toFixed(3), ' Mb / sec')

  });

  it('should parse large nested records quickly, using the new deserializer', function () {
    var limit = 100,
        size = this.serializedDeep.length * limit,
        start = Date.now();

    for (var i = 0; i < limit; i++) {
      newDeserializer.deserialize(this.serializedDeep);
    }

    var stop = Date.now(),
        total = (stop - start) / 1000;

    console.log('New Deserializer Done in ' + total + 's, ', (limit / total).toFixed(3), 'documents / sec', (((size / total) / 1024) / 1024).toFixed(3), ' Mb / sec')

  });
});