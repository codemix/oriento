import {RID} from "../../../data-types";


export default function create (options) {
  const serializationFormat = options.serializationFormat;
  const useToken = options.useToken;
  const protocol = options.protocol;
  const protocolVersion = options.protocolVersion || 28;

  const operations = {};

  operations.DbOpen = {
    write: function (data) {
      this
      .Header({
        opCode: 3,
        sessionId: data.sessionId || -1,
        token: data.token
      })
      .String(data.driverName || 'orientdb-binary-protocol')
      .String(data.driverVersion || '2.0.0')
      .Short(protocolVersion || 19)
      .String('') // client id
      .String(serializationFormat.className)
      .Boolean(useToken)
      .String(data.database) // database name
      .String('graph') // database type
      .String(data.username || 'admin')
      .String(data.password || 'admin');
    },
    read: function () {
      this
      .pushStack({
        status: null,
        sessionId: null,
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
      .pushStack({
        length: null,
        items: null,
        i: 0
      })
      .Short('length')
      .loop('items', function (data) {
        if (data.i >= data.length) {
          this.end();
        }
        data.i++;
        this
        .String('name')
        .Short('id');
      })
      .popStack('clusters', function (data) {
        return data.items;
      })
      .Object('server')
      .String('release')
      .collect(function (data) {
        return {
          sessionId: data.sessionId,
          clusters: data.clusters.reduce(function (list, item) {
            list[item.name] = item;
            return list;
          }, {}),
          server: data.server,
          release: data.release
        };
      });
    }
  };


  operations.DbClose = {
    write: function (data) {
      this
      .Header({
        opCode: 5,
        sessionId: data.sessionId,
        token: data.token
      });
    }
  };


  operations.DbSize = {
    write: function (data) {
      this
      .Header({
        opCode: 8,
        sessionId: data.sessionId,
        token: data.token
      });
    },
    read: function () {
      this
      .Header('header')
      .Long('size')
      .collect(function (data) {
        return data.size;
      });
    }
  };

  operations.DbCountRecords = {
    write: function (data) {
      this
      .Header({
        opCode: 9,
        sessionId: data.sessionId,
        token: data.token
      });
    },
    read: function () {
      this
      .Header('header')
      .Long('count')
      .collect(function (data) {
        return data.count;
      });
    }
  };

  operations.ClusterAdd = {
    write: function (data) {
      this
      .Header({
        opCode: 10,
        sessionId: data.sessionId,
        token: data.token
      })
      .String(data.type)
      .String(data.name)
      .String(data.location || null)
      .String(data.segment)
      .Short(data.id || -1);
    },
    read: function (_, input) {
      this
      .Header('header')
      .Short('id')
      .collect(function (data) {
        return {
          id: data.id,
          name: input.name,
          type: input.type,
          location: input.location || null,
          segment: input.segment
        };
      });
    }
  };

  operations.ClusterDrop = {
    write: function (data) {
      this
      .Header({
        opCode: 11,
        sessionId: data.sessionId,
        token: data.token
      })
      .Short(data.id);
    },
    read: function () {
      this
      .Header('header')
      .Boolean('deleted')
      .collect(function (data) {
        return data.deleted;
      });
    }
  };


  operations.ClusterCount = {
    write: function (data) {
      this
      .Header({
        opCode: 12,
        sessionId: data.sessionId,
        token: data.token
      });
      if (Array.isArray(data.id)) {
        var length = data.id.length,
            i;
        this.Short(length);
        for (i = 0; i < length; i++) {
          this.Short(data.id[i]);
        }
      }
      else {
        this.Short(1);
        this.Short(data.id);
      }
      this.Boolean(data.tombstones);
    },
    read: function () {
      this
      .Header('header')
      .Long('count')
      .collect(function (data) {
        return data.count;
      });
    }
  };

  operations.ClusterRange = {
    write: function (data) {
      this
      .Header({
        opCode: 13,
        sessionId: data.sessionId,
        token: data.token
      })
      .Short(data.id);
    },
    read: function () {
      this
      .Header('header')
      .Long('begin')
      .Long('end')
      .collect(function (data) {
        return {
          begin: data.begin,
          end: data.end
        };
      });
    }
  };

  operations.DbReload = {
    write: function (data) {
      this
      .Header({
        opCode: 73,
        sessionId: data.sessionId,
        token: data.token
      });
    },
    read: function () {
      this
      .Header('header')
      .pushStack({
        length: null,
        items: null,
        i: 0
      })
      .Short('length')
      .loop('items', function (data) {
        if (data.i >= data.length) {
          this.end();
        }
        data.i++;
        this
        .String('name')
        .Short('id')
        .String('type')
        .Short('segment');
      })
      .popStack('clusters', function (data) {
        return data.items;
      })
      .collect(function (data) {
        return {
          clusters: data.clusters
        };
      });
    }
  };



  operations.RecordMetadata = {
    write: function (data) {
      this
      .Header({
        opCode: 29,
        sessionId: data.sessionId,
        token: data.token
      })
      .Short(data.cluster)
      .Long(data.position);
    },
    read: function () {
      this
      .Header('header')
      .Short('cluster')
      .Long('position')
      .Integer('version')
      .collect(function (data) {
        return {
          '@id': new RID({
            cluster: data.cluster,
            position: data.position
          }),
          '@version': data.version
        };
      });
    }
  };

  operations.RecordLoad = {
    write: function (data) {
      this
      .Header({
        opCode: 30,
        sessionId: data.sessionId,
        token: data.token
      })
      .Short(data.cluster)
      .Long(data.position)
      .String(data.fetchPlan || '')
      .Boolean(data.ignoreCache)
      .Boolean(data.tombstones);
    },
    read: function (_, input) {
      this
      .Header('header')
      .loop('records', function () {
        this
        .Byte('status')
        .tap(function (data) {
          switch (data.status) {
          case 0:
            // end of results
            this.end();
            break;
          case 1:
            // a record
            this
            .String('content')
            .Integer('version')
            .Char('type')
            .collect('value', function (data) {
              data.content = serializationFormat.deserialize(data.content);
              return {
                '@type': data.type,
                '@id': new RID({
                  cluster: input.cluster,
                  position: input.position
                }),
                '@version': data.version,
                '@value': data.content
              };
            });
            break;
          case 2:
            // a sub record
            this.Record('value');
            break;
          }
        })
        .collect(function (data) {
          return data.value;
        });
      })
      .collect(function (data) {
        return data.records;
      });
    }
  };

  operations.RecordCreate = {
    write: function (data) {
      this
      .Header({
        opCode: 31,
        sessionId: data.sessionId,
        token: data.token
      })
      .Integer(data.segment || -1)
      .Short(data.cluster);

      if (data.record instanceof data.database.types.BinaryRecord) {
        this.Bytes(data.record['@value']).Char('b');
      }
      else if (data.record instanceof data.database.types.FlatRecord) {
        this.Object(data.record['@value']).Char('f');
      }
      else {
        this.Object(data.record['@value']).Char('d');
      }

      this.Boolean(data.async);
    },
    read: function (_, input) {
      this
      .Header('header')
      .Long('position')
      .Integer('version')
      .collect(function (data) {
        return {
          '@id': new RID({
            cluster: input.cluster,
            position: data.position
          }),
          '@version': data.version
        };
      });
    }
  };


  operations.RecordUpdate = {
    write: function (data) {
      this
      .Header({
        opCode: 32,
        sessionId: data.sessionId,
        token: data.token
      })
      .Short(data.cluster)
      .Long(data.position)
      .Object(data.record)
      .Integer(data.version || -1)
      .Char(data.type || 'd')
      .Boolean(data.async);
    },
    read: function () {
      this
      .Header('header')
      .Integer('version')
      .collect(function (data) {
        return {
          '@version': data.version
        };
      });
    }
  };

  operations.RecordDelete = {
    write: function (data) {
      this
      .Header({
        opCode: 33,
        sessionId: data.sessionId,
        token: data.token
      })
      .Short(data.cluster)
      .Long(data.position)
      .Object(data.record)
      .Integer(data.version || -1)
      .Boolean(data.async);
    },
    read: function () {
      this
      .Header('header')
      .Boolean('deleted')
      .collect(function (data) {
        return data.deleted;
      });
    }
  };


  operations.RecordCleanOut = {
    write: function (data) {
      this
      .Header({
        opCode: 38,
        sessionId: data.sessionId,
        token: data.token
      })
      .Short(data.cluster)
      .Long(data.position)
      .Object(data.record)
      .Integer(data.version || -1)
      .Boolean(data.async);
    },
    read: function () {
      this
      .Header('header')
      .Boolean('cleaned')
      .collect(function (data) {
        return data.cleaned;
      });
    }
  };

  operations.Command = {
    write: function (data) {
      this
      .Header({
        opCode: 41,
        sessionId: data.sessionId,
        token: data.token
      })
      .Char(data.async ? 'a' : 's')
      .Bytes(encodeQuery$Command(data));
    },
    read: function () {
      this
      .Header('header')
      .loop('results', function () {
        this
        .Byte('status')
        .tap(function (data) {
          switch (data.status) {
          case 0:
            // end of data
            this.end();
            break;
          case 110:
            // null
            data['@type'] = 'orient:Record';
            data['@value'] = null;
            break;
          case 1:
          case 114:
            // a record
            data['@type'] = 'orient:Record';
            this.Record('@value');
            break;
          case 2:
            // prefetched record
            data['@type'] = 'orient:Prefetched';
            this.Record('@value');
            break;
          case 97:
            // serialized result
            data['@type'] = 'orient:FlatRecord';
            this.Object('@value');
            break;
          case 108:
            // collection of records
            data['@type'] = 'orient:Collection';
            this.Collection('@value');
            break;
          }
        })
        .collect(function (data) {
          if (data['@type'] === 'orient:FlatRecord') {
            return data['@value'];
          }
          return {
            '@type': data['@type'],
            '@value': data['@value']
          };
        });
      })
      .collect(function (data) {
        if (data.results.length === 1 && data.results[0]['@type'] === 'orient:Collection') {
          return data.results[0];
        }
        else if (data.results.length === 1 &&
          data.results[0]['@type'] === 'orient:Record' &&
          data.results[0]['@value']
        ) {
          return {
            '@type': 'orient:Collection',
            '@value': [data.results[0]['@value']]
          };
        }
        else if (data.results.length === 1) {
          return {
            '@type': 'orient:Collection',
            '@value': data.results
          };
        }
        else {
          return {
            '@type': 'orient:ResultSet',
            '@graph': data.results.reduce((results, item) => {
              if (item['@type'] === 'orient:Collection') {
                results.push(item);
                results.push(...item['@value']);
                item['@value'] = item['@value'].map(item => item['@rid']);
              }
              else if (item['@type'] === 'orient:Prefetched') {
                results.push(item['@value']);
              }
              else {
                results.push(item);
              }
              return results;
            }, [])
          };
        }
      });
    }
  };

  function encodeQuery$Command (data) {
    var writer = protocol.createWriter();
    writer.String(data.class);
    if (data.class === 'q' ||
        data.class.substr(-14, 14) === 'OSQLSynchQuery' ||
        data.class.slice(-15, 15) === 'OSQLAsynchQuery'
    ) {
      writer
      .String(data.query)
      .Integer(data.limit || -1)
      .String(data.fetchPlan || '');

      if (data.params && Object.keys(data.params).length) {
        writer.String(serializeParams$Command(data.params));
      }
      else {
        writer.Integer(0);
      }
    }
    else if (
      data.class === 's' ||
      data.class === 'OCommandScript'
    ) {
      writer
      .String(data.language || 'sql')
      .String(data.script || data.query);
      if (data.params && Object.keys(data.params).length) {
        writer
        .Boolean(true)
        .String(serializeParams$Command(data.params));
      }
      else {
        writer.Boolean(false);
      }
      writer.Boolean(false);
    }
    else {
      writer.String(data.query);
      if (data.params && Object.keys(data.params).length) {
        writer
        .Boolean(true)
        .String(serializeParams$Command(data.params));
      }
      else {
        writer.Boolean(false);
      }
      writer.Boolean(false);
    }
    return writer.buffer;
  }

  /**
   * Serialize the parameters for a query.
   *
   * > Note: There is a bug in OrientDB where special kinds of string values
   * > need to be twice quoted *in parameters*. Hence the need for this specialist function.
   *
   * @param  {Object} data The data to serialize.
   * @return {String}      The serialized data.
   */
  function serializeParams$Command (data) {
    var keys = Object.keys(data.params),
        total = keys.length,
        c, i, key, value;

    for (i = 0; i < total; i++) {
      key = keys[i];
      value = data.params[key];
      if (typeof value === 'string') {
        c = value.charAt(0);
        if (c === '#' || c === '<' || c === '[' || c === '(' || c === '{' || c === '0' || +c) {
          data.params[key] = '"' + value + '"';
        }
      }
    }
    return serializationFormat.serialize(data);
  }

  operations.Commit = {
    write: function (data) {
      var self = this;
      this
      .Header({
        opCode: 60,
        sessionId: data.sessionId,
        token: data.token
      })
      .Integer(data.id)
      .Boolean(data.log);

      if (data.creates) {
        data.creates.forEach(function (item) {
          self
          .Byte(1) // start of an entry
          .Byte(3) // create
          .Short(item['@id'].cluster)
          .Long(item['@id'].position);

          if (item instanceof data.database.types.BinaryRecord) {
            this.Bytes(item['@value']).Char('b');
          }
          else if (item instanceof data.database.types.FlatRecord) {
            this.Object(item['@value']).Char('f');
          }
          else {
            this.Object(item['@value']).Char('d');
          }

        });
      }
      if (data.updates) {
        data.updates.forEach(function (item) {
          self
          .Byte(1) // start of an entry
          .Byte(1) // update
          .Short(item['@id'].cluster)
          .Long(item['@id'].position);

          if (item instanceof data.database.types.BinaryRecord) {
            self
            .Char('b')
            .Integer(item['@version'] || 0)
            .Bytes(item['@value']);
          }
          else if (item instanceof data.database.types.FlatRecord) {
            self
            .Char('f')
            .Integer(item['@version'] || 0)
            .Object(item['@value']);
          }
          else {
            self
            .Char('d')
            .Integer(item['@version'] || 0)
            .Object(item['@value']);
          }
        });
      }
      if (data.deletes) {
        data.deletes.forEach(function (item) {
          self
          .Byte(1) // start of an entry
          .Byte(2) // delete
          .Short(item['@id'].cluster)
          .Long(item['@id'].position);
          if (item instanceof data.database.types.BinaryRecord) {
            self.Char('b');
          }
          else if (item instanceof data.database.types.FlatRecord) {
            self.Char('f');
          }
          else {
            self.Char('d');
          }
          self.Integer(item['@version'] || 0);
        });
      }

      self.Byte(0); // no more documents
    },
    read: function (propertyName, input) {
      this
      .Header('header')
      .pushStack({
        i: 0,
        length: null,
        items: null
      })
      .Integer('length')
      .loop('items', function (data) {
        if (data.i >= data.length) {
          return this.end();
        }
        data.i++;
        this
        .RID('tmp')
        .RID('@id');
      })
      .popStack('created', function (data) {
        return data.items;
      })
      .pushStack({
        i: 0,
        length: null,
        items: null
      })
      .Integer('length')
      .loop('items', function (data) {
        if (data.i >= data.length) {
          return this.end();
        }
        data.i++;
        this
        .RID('@id')
        .Integer('@version');
      })
      .popStack('updated', function (data) {
        return data.items;
      });

      if (!input || input.storage !== 'memory') {
        this
        .pushStack({
          i: 0,
          length: null,
          items: null
        })
        .Integer('length')
        .loop('items', function (data) {
          if (data.i >= data.length) {
            return this.end();
          }
          data.i++;
          this
          .UUID('uuid')
          .Long('fileId')
          .Long('pageIndex')
          .Integer('pageOffset');
        })
        .popStack('changes', function (data) {
          return data.items;
        });
      }

      this.collect(function (data) {
        return {
          created: data.created,
          updated: data.updated,
          changes: data.changes
        };
      });
    }
  };
  return operations;
}