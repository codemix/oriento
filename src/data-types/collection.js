/**
 * # Collection
 *
 * Represents a collection of documents or values.
 */
class Collection extends Array {
  /**
   * Construct the collection.
   * @param  {Array} items The items to add to the collection.
   */
  constructor (items) {
    super();
    if (items instanceof Collection || Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        this.push(items[i]);
      }
    }
  }

  /**
   * Return a representation of the collection which can be safely encoded as JSON.
   * @return {Object} The JSON-safe version of the collection.
   */
  toJSON () {
    return {
      '@type': 'orient:Collection',
      '@value': this.map(identity)
    };
  }
}

Collection.prototype['@type'] = 'orient:Collection';

function identity (item) {
  return item;
}

export default Collection;