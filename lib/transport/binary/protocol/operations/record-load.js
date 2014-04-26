'use strict';

var Operation = require('../operation'),
  constants = require('../constants'),
  RID = require('../../../../recordid'),
  deserializer = require('../deserializer'),
  errors = require('../../../../errors');

module.exports = Operation.extend({
  id: 'REQUEST_RECORD_LOAD',
  opCode: 30,
  writer: function() {
    this
      .writeByte(this.opCode)
      .writeInt(this.data.sessionId)
      .writeShort(this.data.cluster)
      .writeLong(this.data.position)
      .writeString(this.data.fetchPlan || '')
      .writeByte(this.data.ignoreCache || 0)
      .writeByte(this.data.tombstones || 0);
  },
  reader: function() {
    var records = [];
    this.readStatus('status');
    this.readOps.push(function(data) {
      data.records = records;
      this.stack.push(data.records);
      this.readPayload(records, function() {
        this.stack.pop();
        data.records = data.records.map(function(record) {
          var r;
          if(record.type === 'd') {
            r = record.content || {};
            r['@rid'] = r['@rid'] || new RID({
              cluster: record.cluster,
              position: record.position
            });
            r['@version'] = record.version;
            r['@type'] = record.type;
          }
          else {
            r = {
              '@rid': new RID({
                cluster: record.cluster,
                position: record.position
              }),
              '@version': record.version,
              '@type': record.type,
              value: record.content
            };

          }
          return r;
        }, this);
      });
    });
  },
  readPayload: function(records, ender) {
    var self = this;

    return self.readByte('payloadStatus', function(data, fieldName) {
      var record = {};
      switch(data[fieldName]) {
        case 0:
          // nothing to do.
          if(ender) {
            ender.call(self);
          }
          break;
        case 1:
          // a record
          records.push(record);
          self.stack.push(record);
          self
            .readString('content')
            .readInt('version')
            .readChar('type', function(data, fieldName) {
              data.cluster = self.data.cluster;
              data.position = self.data.position;
              if(data[fieldName] === 'd') {
                data.content = deserializer.deserialize(data.content);
              }
              self.stack.pop();
              self.readPayload(records, ender);
            });
          break;
        case 2:
          // a sub record
          records.push(record);
          self.stack.push(record);
          self.readShort('classId', function(data, fieldName) {
            switch(data[fieldName]) {
              case -2:
                self.stack.pop();
                self.readPayload(records, ender);
                break;
              case -3:
                throw new errors.Protocol('ClassID ' + data[fieldName] + ' is not supported.');
              default:
                self
                  .readChar('type')
                  .readShort('cluster')
                  .readLong('position')
                  .readInt('version')
                  .readString('content', function(data, fieldName) {
                    if(data.type === 'd') {
                      data.content = deserializer.deserialize(data.content);
                    }
                    self.stack.pop();
                    self.readPayload(records, ender);
                  });
            }
          });
          break;
        default:
          self.readPayload(records, ender);
      }
    });
  }
});