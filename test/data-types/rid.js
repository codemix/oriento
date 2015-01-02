import RID from '../../src/data-types/rid';

describe('RID', function () {
  describe('::constructor()', function () {
    it('should ensure the instance type', function () {
      RID().should.be.an.instanceOf(RID);
    });

    it('should parse a passed string', function () {
      RID('#12:10').should.eql(new RID({
        cluster: 12,
        position: 10
      }));
    });

    it('should parse a passed object', function () {
      RID({cluster: 12, position: 10}).should.eql(new RID({
        cluster: 12,
        position: 10
      }));
    });

    it('should parse a passed array of values', function () {
      RID(['#12:10', {cluster: 12, position: 20}]).should.eql([
        new RID({
          cluster: 12,
          position: 10
        }),
        new RID({
          cluster: 12,
          position: 20
        })
      ]);
    });

    it('should reject invalid string values', function () {
      (function () {
        return RID('nope');
      }).should.throw(/invalid/i);
    });

    it('should reject invalid object values', function () {
      (function () {
        return RID({wat: 'no'});
      }).should.throw(/invalid/i);
    });

    it('should reject invalid input values', function () {
      (function () {
        return RID(true);
      }).should.throw(/invalid/i);
    });
  });

  describe('::isTemporary', function () {
    it('should be false for persisted RIDs', function () {
      RID('#12:10').isTemporary.should.be.false;
    });

    it('should be true for temporary RIDs', function () {
      RID('#-12:10').isTemporary.should.be.true;
    });

    it('should be false for unconfigured RIDs', function () {
      RID().isTemporary.should.be.false;
    });
  });

  describe('::equals()', function () {
    var rid;
    before(() => {
      rid = new RID('#12:10');
    });
    it('should equal itself', function () {
      rid.equals(rid).should.be.true;
    });
    it('should equal a document with an embedded RID', function () {
      rid.equals({'@rid': RID('#12:10'), foo: 'bar'}).should.be.true;
    });
    it('should equal a string', function () {
      rid.equals('#12:10').should.be.true;
    });
    it('should equal an identical other RID', function () {
      rid.equals(RID('#12:10')).should.be.true;
    });
    it('should equal a RID encoded as an object', function () {
      rid.equals({cluster: 12, position: 10}).should.be.true;
    });

    it('should not equal a different string', function () {
      rid.equals('#12:20').should.be.false;
    });
    it('should not equal a document with an embedded different RID', function () {
      rid.equals({'@rid': RID('#12:12230'), foo: 'bar'}).should.be.false;
    });
    it('should not equal an different RID', function () {
      rid.equals(RID('#12:20')).should.be.false;
    });
    it('should not equal a different RID encoded as an object', function () {
      rid.equals({cluster: 12, position: 20}).should.be.false;
      rid.equals({cluster: 2, position: 10}).should.be.false;
    });
  });


  describe('::toString()', function () {
    it('should return the correct value', function () {
      RID('#12:10').toString().should.equal('#12:10');
    });
  });

  describe('::valueOf()', function () {
    it('should return the correct value', function () {
      RID('#12:10').valueOf().should.equal('#12:10');
    });
  });

  describe('::toJSON()', function () {
    it('should return the correct value', function () {
      RID('#12:10').toJSON().should.equal('#12:10');
    });
  });
});