import {name as driverName, version as driverVersion} from "../../../../package.json";

export default function create (options) {
  const serializationFormat = options.serializationFormat;
  const useToken = options.useToken;
  const protocolVersion = options.protocolVersion || 28;

  const operations = {};

  operations.Negotiate = {
    read: function (propertyName) {
      return this.Short(propertyName);
    }
  };

  operations.Header = {
    read: function (propertyName) {
      this
      .pushStack({
        status: null,
        sessionId: null,
        token: null,
        error: null
      })
      .Byte('status')
      .Integer('sessionId');
      if (useToken) {
        this.Bytes('token');
      }
      this.tap(function (data) {
        if (data.status === 1) {
          this
          .Error('error')
          .popStack(propertyName)
          .end(function (data) {
            return data[propertyName].error;
          });
        }
        // @todo handle push data
      })
      .popStack(propertyName);
    },
    write: function (value) {
      this
      .Byte(value.opCode)
      .Integer(value.sessionId || -1);
      if (useToken) {
        this.Bytes(value.token);
      }
    }
  };

  operations.Connect = {
    write: function (data) {
      this
      .Header({
        opCode: 2
      })
      .String(data.driverName || driverName)
      .String(data.driverVersion || driverVersion)
      .Short(protocolVersion)
      .String('') // client id
      .String(serializationFormat.className)
      .Boolean(useToken)
      .String(data.username || 'root')
      .String(data.password || 'root');
    },
    read: function () {
      this
      .pushStack({
        status: null,
        sessionId: null,
        token: null,
        error: null
      })
      .Byte('status')
      .Integer('sessionId')
      .tap(function (data) {
        if (data.status === 1) {
          this
          .Error('error')
          .popStack('header')
          .end(function (data) {
            return data.header.error;
          });
        }
        // @todo handle push data
      })
      .popStack('header')
      .Integer('sessionId')
      .Bytes('token')
      .collect(function (data) {
        return {
          sessionId: data.sessionId,
          token: data.token
        };
      });
    }
  };



  operations.DbCreate = {
    write: function (data) {
      this
      .Header({
        opCode: 4,
        sessionId: data.sessionId,
        token: data.token
      })
      .String(data.name)
      .String('graph')
      .String(data.storage || 'plocal');
    },
    read: function (_, input) {
      this
      .Header('header')
      .collect(function () {
        return {
          name: input.name,
          type: input.type || 'graph',
          storage: input.storage || 'plocal'
        };
      });
    }
  };


  operations.DbExists = {
    write: function (data) {
      this
      .Header({
        opCode: 6,
        sessionId: data.sessionId,
        token: data.token
      })
      .String(data.name)
      .String(data.storage || 'plocal');
    },
    read: function () {
      this
      .Header('header')
      .Boolean('exists')
      .collect(function (data) {
        return data.exists;
      });
    }
  };

  operations.DbDrop = {
    write: function (data) {
      this
      .Header({
        opCode: 7,
        sessionId: data.sessionId,
        token: data.token
      })
      .String(data.name)
      .String(data.storage || 'plocal');
    },
    read: function () {
      this.Header('header')
      .collect(function () {
        return true;
      });
    }
  };

  operations.DbList = {
    write: function (data) {
      this
      .Header({
        opCode: 74,
        sessionId: data.sessionId,
        token: data.token
      });
    },
    read: function () {
      this
      .Header('header')
      .Object('databases')
      .collect(function (data) {
        return Object.keys(data.databases.databases.toObject());
      });
    }
  };

  operations.DbFreeze = {
    write: function (data) {
      this
      .Header({
        opCode: 94,
        sessionId: data.sessionId,
        token: data.token
      })
      .String(data.name)
      .String(data.storage || 'plocal');
    },
    read: function () {
      this
      .Header('header')
      .collect(function () {
        return true;
      });
    }
  };

  operations.DbRelease = {
    write: function (data) {
      this
      .Header({
        opCode: 95,
        sessionId: data.sessionId,
        token: data.token
      })
      .String(data.name)
      .String(data.storage || 'plocal');
    },
    read: function () {
      this
      .Header('header')
      .collect(function () {
        return true;
      });
    }
  };


  operations.ConfigGet = {
    write: function (data) {
      this
      .Header({
        opCode: 70,
        sessionId: data.sessionId,
        token: data.token
      })
      .String(data.key);
    },
    read: function () {
      this
      .Header('header')
      .String('value')
      .collect(function (data) {
        return data.value;
      });
    }
  };

  operations.ConfigSet = {
    write: function (data) {
      this
      .Header({
        opCode: 71,
        sessionId: data.sessionId,
        token: data.token
      })
      .String(data.key)
      .String(data.value);
    },
    read: function () {
      this
      .Header('header')
      .Boolean('accepted')
      .collect(function (data) {
        return data.accepted;
      });
    }
  };

  operations.ConfigList = {
    write: function (data) {
      this
      .Header({
        opCode: 72,
        sessionId: data.sessionId,
        token: data.token
      });
    },
    read: function () {
      this
      .Header('header')
      .pushStack({
        i: 0,
        length: null,
        items: null
      })
      .loop('items', function (data) {
        if (data.i >= data.length) {
          this.end();
        }
        data.i++;
        this
        .String('key')
        .String('value');
      })
      .popStack('items', function (data) {
        return data.items.reduce(function (items, item) {
          if (items[item.key]) {
            items[item.key] = [].concat(items[item.key], item.value);
          }
          else {
            items[item.key] = item.value;
          }
          return items;
        }, {});
      })
      .collect(function (data) {
        return data.items;
      });
    }
  };

  return operations;
}