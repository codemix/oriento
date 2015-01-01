import {create} from "../../../../src/transports/binary/serialization-formats/csv";
import {Document, RID} from "../../../../src/data-types";

class OClass {
  constructor (options = {}) {
    for (let key in options) {
      this[key] = options[key];
    }
  }
  get ["@class"] () {
    return this.constructor.name;
  }
}
class OUser extends OClass {}
class ORole extends OClass {}

describe('Serialization Format: CSV', function () {
  var serialize, deserialize, classes;
  before(() => {
    classes = {
      OUser: OUser,
      ORole: ORole
    };
    let format = create({
      classes: classes
    });
    serialize = format.serialize;
    deserialize = format.deserialize;
  });
  describe('integration tests', function () {
    it('should serialize / deserialize a record', function () {
      let input = new Document({
        string: "hello",
        /*rid: new RID('#12:10'), */
        date: new Date("2010-10-24"),
        int: 10034,
        float: 1.33333,
        true: true,
        false: false,
        null: null
      });
      deserialize(serialize(input)).should.eql(input);
    });
    it('should serialize a simple record', function () {
      serialize({foo: 'bar'}).should.equal('foo:"bar"');
    });

    it('should deserialize a simple record', function () {
      deserialize('foo:"bar"').should.eql(new Document({
        foo: 'bar'
      }));
    });

  });
  describe('Registered classes', function () {
    it('should deserialize into a class', function () {
      let val = deserialize(serialize(new OUser({
        name: 'admin'
      })));

      val.should.be.an.instanceOf(OUser);
      val.name.should.equal('admin');
    });
  });
});