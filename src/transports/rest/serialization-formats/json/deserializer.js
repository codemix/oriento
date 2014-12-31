import {RID, EmbeddedSet, LinkSet} from "../../../../data-types";

export default function create (/*options*/) {
  // const classes = options.classes || {};

  const FIELD_PARSERS = {
    f: parseFloat,
    c: parseFloat,
    l: Number,
    d: Number,
    s: Number,
    b: function parseBinary (value) {
      return value;
    },
    a: dateStringToUTC,
    t: dateStringToUTC,
    e: function parseSet (value) {
      return new EmbeddedSet(value);
    },
    x: function parseLink (value) {
      if (value && value['@rid']) {
        return value;
      }
      else {
        return new RID(value);
      }
    },
    n: function parseLinkSet (value) {
      return new LinkSet(value);
    },
    z: function parseLinkList (value) {
      return {
        '@type': 'orient:LinkList',
        '@value': value
      };
    },
    g: function parseLinkBag (value) {
      return {
        '@type': 'orient:LinkBag',
        '@value': value
      };
    }
  };

  function dateStringToUTC (input) {
    let parts = /^(\d{4})-(\d{2})-(\d{2})(\s(\d{2}):(\d{2}):(\d{2}))?$/.exec(input);
    if (!parts) {
      throw new Error('Invalid Date: ' + input);
    }
    return new Date(Date.UTC(parts[1], parts[2] - 1, parts[3], parts[5], parts[6], parts[7]));
  }

  function reviver (key, value) {
    if (key === '@rid') {
      return new RID(value);
    }
    else if (key === '@type') {
      switch (value) {
        case 'd':
          return 'orient:Document';
        case 'r':
          return 'orient:Record';
        case 'l':
          return 'orient:Collection';
        case 'f':
          return 'orient:FlatRecord';
      }
    }
    else if (key === '@fieldTypes') {
      return decodeFieldTypes(value);
    }
    else if (value && value['@type']) {
      let normalized = {
        '@rid': value['@rid'],
        '@type': value['@class'] ? 'db:'+value['@class'] : value['@type'],
        '@fieldTypes': value['@fieldTypes'],
        '@version': value['@version'],
        '@value': {}
      };
      for (let k in value) {
        if (k.charAt(0) !== '@') {
          normalized['@value'][k] = value[k];
        }
      }
      return normalized;
    }
    return value;
  }


  function decodeFieldTypes (input) {
    return input.split(',').reduce((types, item) => {
      let [name, type] = item.split('=');
      types[name] = type;
      return types;
    }, {});
  }

  function normalize (input) {
    if (input.value) {
      return input.value;
    }
    else if (!Array.isArray(input.result)) {
      return input;
    }
    let records = [];
    let collection = {
      '@type': 'orient:Collection',
      '@value': flatten(input.result, records, {})
    };
    if (records.length === 0) {
      return collection;
    }
    else if (records.length === collection['@value'].length) {
      collection['@value'] = records;
      return collection;
    }
    else {
      return {
        '@type': 'orient:ResultSet',
        '@graph': [collection].concat(records)
      };
    }
  }

  function flatten (input, records, seen) {
    if (input == null || typeof input !== 'object' || input instanceof RID) {
      return input;
    }
    if (Array.isArray(input)) {
      return input
      .map(item => flatten(item, records, seen))
      .filter(item => item !== undefined);
    }
    if (input['@rid'] && seen[input['@rid']]) {
      return input['@rid'];
    }
    else if (input['@rid']) {
      seen[input['@rid']] = true;
    }
    let copied = {},
        subject, target;

    if (input['@type'] === 'orient:Document' &&
       !input['@rid'] &&
       input['@value'] &&
       input['@value'].value !== undefined
    ) {
      return {
        '@type': 'orient:FlatRecord',
        '@value': input['@value'].value
      };
    }
    if (input['@value']) {
      for (let key in input) {
        if (key !== '@value' && key !== '@fieldTypes') {
          copied[key] = input[key];
        }
      }
      subject = input['@value'];
      target = copied['@value'] = {};
    }
    else {
      subject = input;
      target = copied;
    }

    for (let key in subject) { /* jshint ignore:line */
      let value = subject[key];
      if (key === '@fieldTypes') {
        continue;
      }
      else if (key.charAt(0) === '@') {
        target[key] = value;
      }
      else if (input['@fieldTypes'] && input['@fieldTypes'][key]) {
        let flattened = flatten(value, records, seen);
        target[key] = FIELD_PARSERS[input['@fieldTypes'][key]] ?
                        FIELD_PARSERS[input['@fieldTypes'][key]](flattened) :
                        flattened;
      }
      else {
        target[key] = flatten(value, records, seen);
      }

    }
    if (input['@rid']) {
      records.push(copied);
      return copied['@rid'];
    }
    else {
      return copied;
    }

  }


  return function deserialize (input) {
    return normalize(JSON.parse(input, reviver));
  };
}