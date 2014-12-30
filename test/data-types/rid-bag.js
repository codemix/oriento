import {RID, RIDBag} from '../../src/data-types';


describe('RIDBag', function () {
  const serialized = createEmbeddedBagBuffer([
    '#6:0',
    '#6:1',
    '#6:2'
  ]);
  describe('Embedded', function () {
    var bag;
    before(() => {
      bag = new RIDBag(serialized);
    });

    describe('::get type()', function () {
      it('should get the bag type', function () {
        bag.type.should.equal(RIDBag.TYPE_EMBEDDED);
      });
    });

    describe('::get size()', function () {
      it('should get the bag size', function () {
        bag.size.should.equal(3);
      });
    });

    describe('::get uuid()', function () {
      it('should return an empty UUID', function () {
        (bag.uuid === null).should.be.true;
      });
    });

    describe('::values()', function () {
      it('should iterate the values in the bag', function () {
        let total = 0;
        for (let value of bag.values()) {
          value.should.be.an.instanceOf(RID);
          total++;
        }
        total.should.equal(3);
      });
    });

    describe('::forEach()', function () {
      it('should iterate the items in the bag', function () {
        let total = 0;
        bag.forEach(rid => {
          rid.should.be.an.instanceOf(RID);
          total++;
        });
        total.should.equal(3);
      });
    });

    describe('::toArray()', function () {
      it('should return an array of RIDs', function () {
        bag.toArray().should.eql([
          '#6:0',
          '#6:1',
          '#6:2'
        ].map(RID));
      });
    });

    describe('::toJSON()', function () {
      it('should return a JSON-safe representation of the bag', function () {
        JSON.parse(JSON.stringify(bag)).should.eql({
          '@type': 'orient:EmbeddedRIDBag',
          '@value': [
            '#6:0',
            '#6:1',
            '#6:2'
          ]
        });
      });
    });
  });
});


function createEmbeddedBagBuffer (items = []) {
  const buffer = new Buffer(5 + (10 * items.length));
  buffer[0] = RIDBag.TYPE_EMBEDDED;
  let offset = 1;
  buffer.writeInt32BE(items.length, offset);
  offset += 4;
  items.map(RID).forEach(rid => {
    buffer.writeInt16BE(rid.cluster, offset);
    offset += 2;

    buffer.writeInt32BE(rid.position >> 8, offset);
    offset += 4;
    buffer.writeInt32BE(rid.position & 0x00ff, offset);
    offset += 4;
  });
  return buffer;
}
