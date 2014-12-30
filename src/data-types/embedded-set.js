export default class EmbeddedSet extends Set {
  /**
   * Return a representation of the set which can be safely encoded as JSON.
   * @return {Object} The JSON encodable object.
   */
  toJSON () {
    let items = [];
    for (let item of this.values()) {
      items.push(item);
    }
    return {
      '@type': 'orient:EmbeddedSet',
      '@value': items
    };
  }
}