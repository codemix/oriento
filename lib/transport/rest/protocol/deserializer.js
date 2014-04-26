'use strict';

var RecordID = require('../../../recordid'),
  errors = require('../../../errors'),
  Long = require('../../../long').Long;


/**
 * Deserialize a given serialized document.
 *
 * @param  {String}  serialized The serialized document.
 * @return {Object}             The deserialized document
 */
function deserializeDocument(serialized) {
  try {
    return JSON.parse(serialized, function(key, value) {
      if(key === '@rid') {
        return new RecordID(value);
      }
      else if(key === '@fieldTypes') {
        applyFieldTypes(this);
      } else {
        return value;
      }
    });
  }
  catch(e) {
    throw new errors.Request(serialized);
  }
}

function applyFieldTypes(subject) {
  var types = subject['@fieldTypes'].split(',');

  for(var g = 0; g<types.length; g++) {
    var parts = types[g].split('=');
    var fieldName = parts[0];
    var type = parts[1];
    subject[fieldName] = applyFieldType(type, subject[fieldName]);
  }

  return subject;
}

function applyFieldType(type, value) {
  switch(type) {
    case 'f': // float
      return parseFloat(value);
    case 'l': // long
      return Long.fromString(value);
    case 's': //short
      return +value;
    case 'a': // date
    case 't': // datetime
      return new Date(value);
    case 'e': // set
    case 'c': // decimal
    case 'd': // double
    case 'b': // byte
      return value;
    default:
      return value;
  }
}

// Export the public methods
exports.deserializeDocument = deserializeDocument;