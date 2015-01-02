import RID from './rid';

const state = Symbol('state');

/**
 * # RID Bag
 *
 * A bag of Record IDs, can come in two formats:
 *
 *  * embedded - just a list of record ids.
 *  * tree based - a remote tree based data structure
 *
 * for more details on the RID Bag structure, see https://github.com/orientechnologies/orientdb/wiki/RidBag
 *
 */
class RIDBag {

  /**
   * Initialize the RID Bag.
   * @param  {String|Buffer} serialized The serialized bag, either a buffer or base64 string.
   * @param  {ResultSet} resultSet  The resultset this RIDBag is part of, if any.
   */
  constructor (serialized, resultSet) {
    this[state] = {
      serialized: serialized,
      buffer: null,
      type: null,
      uuid: undefined,
      rids: [],
      fileId: null,
      pageIndex: null,
      pageOffset: null,
      changeSize: null,
      current: -1,
      size: null,
      resultSet: resultSet
    };
  }

  /**
   * The type of the RIDBag, either embedded or tree.
   * @type {Number}
   */
  get type () {
    if (this[state].type === null) {
      parse(this);
    }
    return this[state].type;
  }

  /**
   * The size of the RIDBag.
   * @type Number
   */
  get size () {
    if (this[state].size === null) {
      parse(this);
    }
    return this[state].size;
  }


  /**
   * The UUID for the bag.
   * @type {Buffer}
   */
  get uuid () {
    if (this[state].uuid === undefined) {
      parse(this);
    }
    return this[state].uuid;
  }

  /**
   * Call the given function for every RID in the bag.
   *
   * @param  {Function} fn          The visitor function to call.
   * @param  {Object}   thisContext The context for the visitor, if any.
   * @return {this}                 The current RIDBag instance.
   */
  forEach (fn, thisContext) {
    let i = 0;
    for (let value of this.values()) {
      if (thisContext) {
        fn.call(thisContext, value, i++, this);
      }
      else {
        fn(value, i++, this);
      }
    }
    return this;
  }

  /**
   * Return an array representation of the bag.
   *
   * @return {RID[]} An array of RIDs.
   */
  toArray () {
    let values = new Array(this.size);
    let i = 0;
    for (let value of this.values()) {
      values[i++] = value;
    }
    return values;
  }

  /**
   * Return a representation of the bag which can be safely encoded as JSON.
   *
   * > Note: The behavior of this method depends on the bag type.
   * > For embedded bags, the bag will be decoded and the RIDs included.
   * > For tree based bags, the bag will not be decoded, instead a pointer to the bag
   * > will be included for future retrieval.
   *
   * @return {Object} The JSON encodable representation of the bag.
   */
  toJSON () {
    if (this.type === RIDBag.TYPE_EMBEDDED) {
      let values = [];
      for (let value of this.values()) {
        values.push(value);
      }
      return {
        '@type': 'orient:EmbeddedRIDBag',
        '@value': values
      };
    }
    else {
      return {
        '@type': 'orient:TreeRIDBag',
        uuid: this.uuid,
        size: this.size
      };
    }
  }
}

/**
 * A generator which can iterate the contents of the class.
 *
 * @fixme this is defined outside the class until
 * [jshint/jshint#1978](https://github.com/jshint/jshint/issues/1978) is fixed.
 */

function* iterate () {
  var rid;
  if (this.type === RIDBag.TYPE_EMBEDDED) {
    let index = 0;
    while ((rid = consumeEmbedded(this, index++))) {
      yield rid;
    }
  }
  else {
    while ((rid = consumeTree(this))) {
      yield rid;
    }
  }
  return this;
}

RIDBag.prototype.values = iterate;
RIDBag.prototype[Symbol.iterator] = iterate;

RIDBag.TYPE_EMBEDDED = 1;
RIDBag.TYPE_TREE = 2;

export default RIDBag;


function parse (bag) {
  if (bag[state].serialized instanceof Buffer) {
    bag[state].buffer = bag[state].serialized;
  }
  else {
    bag[state].buffer = new Buffer(bag[state].serialized, 'base64');
  }

  let mode = bag[state].buffer[0];

  if ((mode & 1) === 1) {
    return parseEmbedded(bag);
  }
  else {
    return parseTree(bag);
  }
}


function parseEmbedded (bag) {
  let buffer = bag[state].buffer;
  bag[state].type = RIDBag.TYPE_EMBEDDED;
  bag[state].size = buffer.readInt32BE(1);
  bag[state].uuid = null;
  return bag;
}

function parseTree (bag) {
  bag[state].type = RIDBag.TYPE_TREE;

  let buffer = bag[state].buffer;
  bag[state].uuid = buffer.slice(1, 16);
  let offset = 17;


  bag[state].fileId = readLong(buffer, offset);
  offset += 8;
  bag[state].pageIndex = readLong(buffer, offset);
  offset += 8;
  bag[state].pageOffset = buffer.readInt32BE(offset);
  offset += 4;
  bag[state].size = buffer.readInt32BE(offset);
  offset += 4;
  bag[state].changeSize = buffer.readInt32BE(offset);
  offset += 4;

  return bag;
}



function readLong (buffer, offset) {
  let h = buffer.readInt32BE(offset);
  offset += 4;
  let l = buffer.readInt32BE(offset);
  return (h << 8) + l;
}


function consumeEmbedded (bag, index) {
  if (bag[state].rids[index]) {
    return bag[state].rids[index];
  }
  let buffer = bag[state].buffer;

  let offset = 5 + (index * 10);
  if (offset >= buffer.length) {
    return null;
  }
  let rid = new RID({
    cluster: buffer.readInt16BE(offset),
    position: readLong(buffer, offset + 2)
  });

  bag[state].rids[index] = rid;
  return rid;
}

function consumeTree (bag) {
  return bag;
}
