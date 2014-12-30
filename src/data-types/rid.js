/**
 * # Record ID
 *
 * RIDs are unique identifiers for individual records within OrientDB.
 * They consist of two numerical parts, a cluster id and a position.
 * A record ID typically looks like `#5:2`, where `5` is the cluster id and `2` is the position.
 *
 * This class is used to differentiate between actual record ids and strings that merely look like them.
 * Without this, it is impossible to differentiate between `'#1:12'` the string and `#1:12` the record id.
 *
 *
 * @example convert a string to a `RID` instance
 * ```js
 *    var rid = RID('#1:1');
 *    console.log(rid); // => {cluster: 1, position: 1}
 *    console.log('ID:' + rid); // => "ID:#1:1"
 * ```
 * @example convert an array of strings to an array of `RID`s
 * ```js
 *    var rids = RID(['#1:1', '#1:2', '#1:3']);
 *    console.log(rids); // => [{cluster: 1, position: 1}, {cluster: 1, position: 2, {cluster: 1, position: 3}]
 *    console.log(rids.join(', ')); // "#1:1, #1:2, #1:3"
 * ```
 * @example check that a `RID` is valid
 * ```js
 *    RID.isValid('#1:12'); // => true
 *    RID.isValid('not a record id'); // => false
 * ```
 */
class RID {
  /**
   * @param {String|Array|Object} input The *input* to parse.
   */
  constructor (input) {
    if (Array.isArray(input)) {
      return input.map(item => new RID(item));
    }
    else if (typeof input === 'string') {
      let parsed = RID.parse(input);
      if (parsed) {
        return parsed;
      }
      else {
        throw new TypeError('Invalid Record ID');
      }
    }
    else if (!(this instanceof RID)) {
      return new RID(input);
    }

    this.cluster = null;
    this.position = null;

    if (input) {
      if (typeof input !== 'object') {
        throw new TypeError('Invalid Record ID');
      }

      if (input.cluster == +input.cluster) {
        this.cluster = +input.cluster;
      }
      if (input.position == +input.position) {
        this.position = +input.position;
      }
      if (!this.isValid()) {
        throw new TypeError('Invalid Record ID');
      }
    }
  }

  /**
   * Whether the RID is a temporary one or not.
   * @type {Boolean}
   */
  get isTemporary () {
    return this.cluster !== null && this.cluster < 0;
  }

  /**
   * Convert the record id back into a string when being compared or serialized.
   * @return {String} The string representation of the Record ID
   */
  valueOf () {
    return '#' + this.cluster + ':' + this.position;
  }


  /**
   * Convert the record id back into a string when being compared or serialized.
   * @return {String} The string representation of the Record ID
   */
  toString () {
    return '#' + this.cluster + ':' + this.position;
  }


  /**
   * Convert the record id back into a string when being compared or serialized.
   * @return {String} The string representation of the Record ID
   */
  toJSON () {
    return '#' + this.cluster + ':' + this.position;
  }

  /**
   * Determine whether the record id is valid.
   * @return {Boolean} true if the record id is valid.
   */
  isValid () {
    return this.cluster == +this.cluster && this.position == +this.position;
  }

  /**
   * Determine whether the record id is equal to another.
   *
   * @param  {String|RID} rid  The RID to compare with.
   * @return {Boolean}         If the RID matches, then true.
   */
  equals (rid) {
    if (rid === this) {
      return true;
    }
    else if (typeof rid === 'string') {
      return this.toString() === rid;
    }
    else if (rid && rid['@rid']) {
      return this.equals(rid['@rid']);
    }
    else if (rid instanceof RID) {
      return rid.cluster === this.cluster && rid.position === this.position;
    }
    else if ((rid = RID.parse(rid))) {
      return rid.cluster === this.cluster && rid.position === this.position;
    }
    else {
      return false;
    }
  }

  /**
   * Parse a record id into a RID object.
   *
   * @param  {String|Array|Object}          input The input to parse.
   * @return {RID|RID[]|Boolean}        The parsed RID instance(s)
   *                                              or false if the record id could not be parsed
   */
  static parse (input) {
    if (input && typeof input === 'object') {
      if (Array.isArray(input)) {
        return input.map(RID.parse)
        .filter(function (item) {
          return item;
        });
      }
      else if (input.cluster != null && input.position != null) {
        return new RID(input);
      }
      else {
        return false;
      }
    }
    var matches = /^#(-?\d+):(-?\d+)$/.exec(input);
    if (!matches) {
      return false;
    }
    else {
      return new RID({
        cluster: +matches[1],
        position: +matches[2]
      });
    }
  }

  /**
   * Determine whether the given input is a valid record id.
   * @param  {String|Array|Object|RID}  input The record id to check.
   * @return {Boolean}
   */
  static isValid (input) {
    var i, total;
    if (input instanceof RID) {
      return input.isValid();
    }
    else if (typeof input === 'string') {
      return /^#(-?\d+):(-?\d+)$/.test(input);
    }
    else if (input && Array.isArray(input)) {
      total = input.length;
      for (i = 0; i < total; i++) {
        if (!RID.isValid(input[i])) {
          return false;
        }
      }
      return i ? true : false;
    }
    else if (input && typeof input === 'object') {
      return input.cluster == +input.cluster && input.position == +input.position;
    }
    else {
      return false;
    }
  }

  /**
   * Return a record id for a given cluster and position.
   *
   * @param  {Integer} cluster  The cluster ID.
   * @param  {Integer} position The position.
   * @return {String}           The record id.
   */
  static toRid (cluster, position) {
    return "#" + cluster + ":" + position;
  }

}

export default RID;