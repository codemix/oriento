import {
  Collection,
  Document,
  RID,
  EmbeddedMap,
  EmbeddedSet,
  LinkMap,
  LinkSet
} from "../../../../data-types";

export default function create (options) {
  const classes = options.classes || {};

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
      if (value['@class'] && classes[value['@class']]) {
        return new classes[value['@class']](value); // jshint ignore: line
      }
      else if (isValueObject(value)) {
        if (value['@fieldTypes']) {
          castFieldTypes(value);
        }
        return value.value;
      }
      else {
        return new Document(value);
      }
    }
    return value;
  }

  function isValueObject (item) {
    if (item.value === undefined) {
      return false;
    }
    else if (item['@rid']) {
      return false;
    }
    else if (item['@type'] !== 'orient:Document' && item['@type'] !== 'orient:FlatRecord') {
      return false;
    }
    let totalKeys = Object.keys(item).length;
    if (totalKeys > 4) {
      return false;
    }
    else if (item.hasOwnProperty('@version') && item.hasOwnProperty('@fieldTypes')) {
      return totalKeys === 4;
    }
    else if (item.hasOwnProperty('@version') || item.hasOwnProperty('@fieldTypes')) {
      return totalKeys === 3;
    }
    else if (totalKeys === 2) {
      return true;
    }
    else {
      return false;
    }
  }


  function decodeFieldTypes (input) {
    return input.split(',').reduce((types, item) => {
      let [name, type] = item.split('=');
      types[name] = type;
      return types;
    }, {});
  }

  function castFieldTypes (input) {
    let fieldTypes = input['@fieldTypes'];
    if (!fieldTypes) {
      return input;
    }
    let keys = Object.keys(input);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (fieldTypes[key] && FIELD_PARSERS[fieldTypes[key]]) {
        input[key] = FIELD_PARSERS[fieldTypes[key]](input[key]);
      }
    }
    return input;
  }

  function normalize (input) {
    if (input.value) {
      return input.value;
    }
    else if (!Array.isArray(input.result)) {
      return input;
    }
    let records = [];
    let collection = new Collection(flatten(input.result, records, {}));
    if (records.length === 0) {
      return collection;
    }
    else if (records.length === collection.length) {
      return new Collection(records);
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
    if (isValueObject(input)) {
      if (input['@fieldTypes']) {
        castFieldTypes(input);
      }
      return input.value;
    }
    else if (input['@type'] === 'orient:FlatRecord') {
      return input;
    }

    let copied = input instanceof Document ? new Document({'@type': input['@type']}) : {},
        subject, target;
    if (input['@value']) {
      let keys = Object.keys(input);
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
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

    let keys = Object.keys(subject);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let value = subject[key];
      if (key === '@fieldTypes') {
        continue;
      }
      else if (key.charAt(0) === '@') {
        target[key] = value;
      }
      else if (value instanceof RID) {
        target[key] = value;
      }
      else if (input['@fieldTypes'] && input['@fieldTypes'][key]) {
        let flattened = flatten(value, records, seen);
        target[key] = FIELD_PARSERS[input['@fieldTypes'][key]] ?
                        FIELD_PARSERS[input['@fieldTypes'][key]](flattened) :
                        flattened;
      }
      else if (Array.isArray(value)) {
        target[key] = flatten(value, records, seen);
      }
      else if (value !== null && typeof value === 'object' && !(value instanceof RID) && !value['@type']) {
        target[key] = allocateLinkMapOrEmbeddedMap(flatten(value, records, seen));
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

  function allocateLinkMapOrEmbeddedMap (input) {
    let keys = Object.keys(input),
        totalRIDs = 0,
        values = [];
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let rid = (input[key] instanceof RID) ? input[key] : RID.parse(input[key]);
      if (rid) {
        totalRIDs++;
        values.push([key, rid]);
      }
      else {
        values.push([key, input[key]]);
      }
    }
    let isLinkMap = totalRIDs && values.length === totalRIDs;
    if (isLinkMap) {
      return new LinkMap(values);
    }
    else {
      return new EmbeddedMap(values);
    }
  }

  return function deserialize (input) {
    return normalize(JSON.parse(input, reviver));
  };
}