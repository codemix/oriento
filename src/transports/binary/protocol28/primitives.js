import {RequestError} from "../../../errors";
import {RID, Collection} from "../../../data-types";


export default function create (options) {

  const serializationFormat = options.serializationFormat;

  const primitives = {};

  primitives.Byte = {
    read: function (propertyName) {
      this
      .demand(1)
      .collect(propertyName, collectByte);
    },
    write: function (value) {
      this.allocate(1);
      this.buffer[this.offset] = value;
      this.offset += 1;
    }
  };

  function collectByte () {
    var value = this.buffer[this.offset];
    this.offset += 1;
    return value;
  }

  primitives.Char = {
    read: function (propertyName) {
      this
      .Byte(propertyName)
      .collect((data) => {
        data[propertyName] = String.fromCharCode(data[propertyName]);
        return data;
      });
    },
    write: function (value) {
      this.Byte(value.charCodeAt(0));
    }
  };

  primitives.Boolean = {
    read: function (propertyName) {
      this
      .Byte(propertyName)
      .collect((data) => {
        data[propertyName] = data[propertyName] ? true : false;
        return data;
      });
    },
    write: function (value) {
      this.Byte(value ? 1 : 0);
    }
  };

  primitives.Integer = {
    read: function (propertyName) {
      this.Int32BE(propertyName);
    },
    write: function (value) {
      this.Int32BE(value);
    }
  };

  primitives.Short = {
    read: function (propertyName) {
      this.Int16BE(propertyName);
    },
    write: function (value) {
      this.Int16BE(value);
    }
  };

  primitives.Long = {
    read: function (propertyName) {
      this
      .pushStack({h: null, l: null})
      .Int32BE('h')
      .Int32BE('l')
      .popStack(propertyName, (data) => {
        return (data.h << 8) + data.l;
      });
    },
    write: function (value) {
      this
      .Int32BE(value >> 8)
      .Int32BE(value & 0x00ff);
    }
  };

  // @todo make me use node-uuid?
  primitives.UUID = {
    read: function (propertyName) {
      this
      .pushStack({h: null, l: null})
      .Int32BE('hh')
      .Int32BE('hl')
      .Int32BE('lh')
      .Int32BE('ll')
      .popStack(propertyName, popUUID);
    },
    write: function (value) {
      this
      .Int32BE(value.hh)
      .Int32BE(value.hl)
      .Int32BE(value.lh)
      .Int32BE(value.ll);
    }
  };

  function popUUID (data) {
    return {
      '@type': 'orient:UUID',
      hh: data.hh,
      hl: data.hl,
      lh: data.lh,
      ll: data.ll
    };
  }

  primitives.Bytes = {
    read: function (propertyName) {
      this
      .pushStack({length: null, value: null})
      .Integer('length')
      .tap(tapBytes)
      .popStack(propertyName, popStackBytes);
    },
    write: function (value) {
      if (value === null) {
        return this.Integer(-1);
      }
      this
      .Integer(value.length)
      .raw(value);
    }
  };

  function tapBytes (data) {
    if (data.length === -1) {
      data.value = null;
    }
    else if (data.length === 0) {
      data.value = new Buffer(0);
    }
    else {
      this.raw('value', data.length);
    }
  }

  function popStackBytes (data) {
    return data.value;
  }


  primitives.String = {
    read: function (propertyName) {
      this
      .Bytes(propertyName)
      .collect((data) => {
        if (data[propertyName] !== null) {
          data[propertyName] = data[propertyName].toString('utf8');
        }
        return data;
      });
    },
    write: function (value) {
      if (value == null) {
        this.Integer(-1);
      }
      else {
        this.Bytes(new Buffer(value, 'utf8'));
      }
    }
  };

  primitives.Error = {
    read: function (propertyName) {
      this
      .pushStack({id: null, errors: null, hasMore: true, trace: null})
      .Byte('id')
      .loop('errors', function (data) {
        if (!data.hasMore) {
          return this.end();
        }
        this
        .String('type')
        .String('message')
        .Boolean('hasMore')
        .collect(item => {
          data.hasMore = item.hasMore;
          return new RequestError(item.message, item);
        });
      })
      .Bytes('trace')
      .popStack(propertyName, popStackError);
    }
  };


  function popStackError (data) {
    var error = data.errors.reduceRight((a, b) => {
      a.prev = b;
      return a;
    });
    error.trace = data.trace;
    return error;
  }

  primitives.RID = {
    read: function (propertyName) {
      this
      .pushStack(new RID())
      .Short('cluster')
      .Long('position')
      .popStack(propertyName);
    },
    write: function (value) {
      this
      .Short(value.cluster)
      .Long(value.position);
    }
  };

  primitives.Record = {
    read: function (propertyName) {
      this
      .pushStack({
        '@value': null
      })
      .Short('@type')
      .tap(tapRecord)
      .popStack(propertyName);
    }
  };

  function tapRecord (data) {
    if (data['@type'] === -2) {
      // null record
      return;
    }
    else if (data['@type'] === -3) {
      // record id
      this.RID('@value');
    }
    else {
      // normal record
      this
      .pushStack({
        '@type': null,
        '@rid': null,
        '@version': null,
        '@value': null
      })
      .Char('@type')
      .RID('@rid')
      .Integer('@version')
      .tap(tapNormalRecord)
      .popStack('@value')
      .collect(data => {
        let item = data['@value'];
        switch (item['@type']) {
          case 'd':
            item['@type'] = 'orient:Document';
            break;
          case 'f':
            return item['@value'];
        }
        if (item['@value']) {
          let record = item['@value'];
          record['@rid'] = item['@rid'];
          record['@version'] = item['@version'];
          return record;
        }
        else {
          return item;
        }
      });
    }
  }

  function tapNormalRecord (data) {
    if (data['@type'] === 'd') {
      this.Object('@value');
    }
    else {
      this.Bytes('@value');
    }
  }

  primitives.Collection = {
    read: function (propertyName) {
      this
      .pushStack({
        length: null,
        i: 0,
        items: null
      })
      .Integer('length')
      .loop('items', loopCollection)
      .popStack(propertyName, popStackCollection);
    }
  };

  function loopCollection (data) {
    if (data.i >= data.length) {
      this.end();
    }
    data.i++;
    this
    .Record('item')
    .collect(collectLoopCollection);
  }

  function collectLoopCollection (data) {
    return data.item;
  }

  function popStackCollection (data) {
    return new Collection(data.items);
  }


  primitives.Object = {
    read: function (propertyName) {
      this
      .String(propertyName)
      .collect(propertyName, (data) => {
        if (propertyName) {
          return serializationFormat.deserialize(data[propertyName]);
        }
        else {
          return serializationFormat.deserialize(data);
        }
      });
    },
    write: function (value) {
      this.String(serializationFormat.serialize(value));
    }
  };

  return primitives;
}