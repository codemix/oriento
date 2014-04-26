'use strict';

var Operation = require('../operation'),
  constants = require('../constants');

module.exports = Operation.extend({
  id: 'REQUEST_CONFIG_LIST',
  opCode: 72,
  writer: function() {
    this
      .writeByte(this.opCode)
      .writeInt(this.data.sessionId || -1);
  },
  reader: function() {
    this
      .readStatus('status')
      .readShort('total')
      .readArray('items', function(data) {
        var items = [];
        var fnc = function() {
          this
            .readString('key')
            .readString('value');
        };

        for(var g = 0; g<data.total; g++) {
          items.push(fnc);
        }
        return items;
      });
  }
});