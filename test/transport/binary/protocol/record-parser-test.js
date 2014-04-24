var serializer = LIB.transport.BinaryTransport.protocol.serializer,
    parser = LIB.transport.BinaryTransport.protocol.recordParser;


describe('PegJS Record Parser', function () {
  it('should parse a simple record', function () {
    var input = {
      '@class': 'OUser',
      '@type': 'd',
      name: 'admin',
      password: 'admin',
      status: 'ACTIVE',
      int: 12345,
      minus: -12345,
      float: 123.456,
      null: null,
      true: true,
      false: false,
      date: new Date(),
      rid: new LIB.RID('#12:10'),
      array: [1, 2, 3, new LIB.RID('#12:10')],
      emptyArray: [],
      singleArray: [1],
      nested: {
        foo: 'bar',
        baz: 123,
        deeper: {
          greeting: 'Hello World'
        }
      }
    };
    var serialized = serializer.serializeDocument(input);
    //console.log(serialized);
    var output = parser.parse(serialized);
    //console.log(output);
    output.should.eql(input);
  });
});