import RID from '../../src/data-types/rid';
import Document from '../../src/data-types/document';

describe('Document', function () {
  describe('::constructor()', function () {
    it('should create a document from an OrientDB response', function () {
      let doc = new Document({
        '@type': 'd',
        '@class': 'OUser',
        '@rid': new RID('#5:0'),
        '@version': 0,
        name: 'admin',
        status: 'ACTIVE'
      });
      doc['@type'].should.equal('db:OUser');
      doc['@rid'].equals('#5:0').should.be.true;
      doc.name.should.equal('admin');
      doc.status.should.equal('ACTIVE');
    });

    it('should create a blank document', function () {
      let doc = new Document();
      doc['@type'].should.equal('orient:Document');
    });
  });

  describe('toJSON()', function () {
    it('should stringify a document', function () {
      let doc = new Document({
        '@type': 'd',
        '@class': 'OUser',
        '@rid': new RID('#5:0'),
        '@version': 0,
        name: 'admin',
        status: 'ACTIVE'
      });
      let result = JSON.parse(JSON.stringify(doc));
      result.should.eql({
        '@type': 'db:OUser',
        '@rid': '#5:0',
        '@version': 0,
        '@value': {
          name: 'admin',
          status: 'ACTIVE'
        }
      });
    });

    it('should stringify a blank document', function () {
      let doc = new Document();
      let result = JSON.parse(JSON.stringify(doc));
      result.should.eql({
        '@type': 'orient:Document',
        '@value': {}
      });
    });
  });
});