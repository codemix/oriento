export default class EmbeddedMap extends Map {

  /**
   * Return an object containing values in the map.
   * @return {Object} The values.
   */
  toObject () {
    let obj = {};
    for (let [key, value] of this.entries()) {
      obj[key] = value;
    }
    return obj;
  }

  /**
   * Return a representation of the map which can be safely encoded as JSON.
   * @return {Object} The JSON encodable object.
   */
  toJSON () {
    return {
      '@type': 'orient:EmbeddedMap',
      '@value': this.toObject()
    };
  }
}