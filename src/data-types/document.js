export default class Document {
  constructor (input) {
    if (input) {
      let keys = Object.keys(input);
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (key !== '@class' && key !== '@type') {
          this[key] = input[key];
        }
      }
      if (input['@class']) {
        this['@type'] = 'db:'+input['@class'];
      }
      else if (input['@type']) {
        this['@type'] = input['@type'];
      }
      else {
        this['@type'] = 'orient:Document';
      }
    }
    else {
      this['@type'] = 'orient:Document';
    }
  }

  toJSON () {
    let value = {};
    let keys = Object.keys(this);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (key.charCodeAt(0) !== 64 /* `@` */) {
        value[key] = this[key];
      }
    }
    return {
      '@type': this['@type'],
      '@rid': this['@rid'],
      '@version': this['@version'],
      '@value': value
    };
  }
}
