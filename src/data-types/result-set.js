/**
 * # Result Set
 *
 * Represents a flattened set of results.
 * This is necessary because documents in the results can have cyclical references,
 * making them impossible to safely JSON encode. This class contains a flattened list
 * of documents, which can be safely JSON encoded, and also provides a method `.assemble()`
 * which can resolve references and return the original data structures.
 *
 */
class ResultSet extends Array {
  /**
   * Construct the result set.
   * @param  {Array} items The items to add to the result set.
   */
  constructor (items) {
    super();
    if (items instanceof ResultSet || Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        this.push(items[i]);
      }
    }
  }

  assemble () {
    return this;
  }

  /**
   * Return a representation of the result set which can be safely encoded as JSON.
   * @return {Object} The JSON-safe version of the result set.
   */
  toJSON () {
    return {
      '@type': 'orient:ResultSet',
      '@graph': this.map(identity)
    };
  }
}

ResultSet.prototype['@type'] = 'orient:ResultSet';

function identity (item) {
  return item;
}

export default ResultSet;