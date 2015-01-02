import RID from './rid';

/**
 * # Link Map
 *
 * Represents a map of (string) keys to RIDs in a document.
 */
export default class LinkMap extends Map {
  /**
   * Add an item to the map.
   * @param {String} key  The key to add.
   * @param {RID}   rid   The RID to add.
   * @return {this}       The `LinkMap` instance.
   */
  set (key, rid) {
    if (!(rid instanceof RID)) {
      if (rid && rid['@rid']) {
        rid = rid['@rid'];
      }
      else {
        rid = new RID(rid);
      }
    }
    return super.set(key, rid);
  }

  /**
   * Return an object containing values in the map.
   * @return {Object} The values.
   */
  toObject () {
    let obj = {};
    for (let [key, rid] of this.entries()) {
      obj[key] = rid;
    }
    return obj;
  }

  /**
   * Return a representation of the map which can be safely encoded as JSON.
   * @return {Object} The JSON encodable object.
   */
  toJSON () {
    return {
      '@type': 'orient:LinkMap',
      '@value': this.toObject()
    };
  }
}