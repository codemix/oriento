import RID from './rid';

/**
 * # Link Set
 *
 * Represents a set of RIDs in a document.
 */
export default class LinkSet extends Set {
  /**
   * Add an item to the set.
   * @param {RID}   rid The RID to add.
   * @return {this}     The `LinkSet` instance.
   */
  add (rid) {
    if (!(rid instanceof RID)) {
      if (rid && rid['@rid']) {
        rid = rid['@rid'];
      }
      else {
        rid = new RID(rid);
      }
    }
    return super.add(rid);
  }

  /**
   * Determine whether the given RID exists in the set.
   * @param  {RID}     rid The RID to check.
   * @return {Boolean}     `true` if the item exists.
   */
  has (rid) {
    for (let item of this.values()) {
      if (item.equals(rid)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Remove an item from the set.
   * @param  {RID}      rid The RID to remove.
   * @return {Boolean}      `true` if the item was found and deleted.
   */
  delete (rid) {
    for (let item of this.values()) {
      if (item.equals(rid)) {
        return super.delete(item);
      }
    }
    return false;
  }

  /**
   * Return an array of values in the set.
   * @return {Array} The values.
   */
  toArray () {
    let items = [];
    for (let rid of this.values()) {
      items.push(rid);
    }
    return items;
  }

  /**
   * Return a representation of the set which can be safely encoded as JSON.
   * @return {Object} The JSON encodable object.
   */
  toJSON () {
    return {
      '@type': 'orient:LinkSet',
      '@value': this.toArray()
    };
  }
}