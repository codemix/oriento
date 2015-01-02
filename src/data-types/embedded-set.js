/**
 * # Embedded Set
 *
 * Represents a set of values in a document.
 */
export default class EmbeddedSet extends Set {

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
      '@type': 'orient:EmbeddedSet',
      '@value': this.toArray()
    };
  }
}