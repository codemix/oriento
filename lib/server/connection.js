'use strict';

var net = require('net'),
  util = require('util'),
  utils = require('../utils'),
  errors = require('../errors'),
  Operation = require('../protocol/operation'),
  operations = require('../protocol/operations'),
  EventEmitter = require('events').EventEmitter,
  Promise = require('bluebird');

function Connection(config) {
  EventEmitter.call(this);
  config = config || {};
  this.host = config.host || 'localhost';
  this.port = +config.port || 2424;
  this.socket = null;
  this.logger = config.logger || {debug: function() {
  }};
  this.setMaxListeners(Infinity);

  this.queue = [];
  this.writes = [];
  this.remaining = null;
}

util.inherits(Connection, EventEmitter);

module.exports = Connection;

/**
 * Connect to the server.
 *
 * @promise {Connection} The connection instance.
 */
Connection.prototype.connect = function() {
  if(this.connecting) {
    return this.connecting;
  }
  else if(this.socket) {
    return Promise.resolve(this);
  }

  this.socket = this.createSocket();
  return this.negotiateConnection();
};

/**
 * Send an operation to the server.
 *
 * @param   {String|Operation} op The operation name or instance.
 * @param   {Object} params       The parameters for the operation, if op is a string.
 * @promise {Object}              The result of the operation.
 */
Connection.prototype.send = function(op, params) {
  if(this.connecting) {
    return this.connecting.then(this._sendOp.bind(this, op, params));
  }
  else if(this.socket) {
    return this._sendOp(op, params);
  }
  else {
    return this.connect().then(this._sendOp.bind(this, op, params));
  }
};

/**
 * Send an operation to the server.
 *
 * @param   {String|Operation} op The operation name or instance.
 * @param   {Object} params       The parameters for the operation, if op is a string.
 * @promise {Object}              The result of the operation.
 */
Connection.prototype._sendOp = function(op, params) {
  var self = this;

  return new Promise(function(resolve, reject) {
    if(typeof op === 'string') {
      op = new operations[op](params || {});
    }

    // Define the write operations
    op.writer();

    // Define the read operations
    op.reader();

    var buffer = op.buffer();

    if(self.socket) {
      self.socket.write(buffer);
    } else {
      self.writes.push(buffer);
    }

    if(op.id === 'REQUEST_DB_CLOSE') {
      resolve({});
    } else {
      self.queue.push([op, {resolve: resolve, reject: reject}]);
    }
  });
};

/**
 * Cancel all the operations in the queue.
 *
 * @param  {Error} err      The error object, if any.
 * @return {Connection}     The connection instance.
 */
Connection.prototype.cancel = function(err) {
  while(this.queue.length) {
    var item = this.queue.shift();
    //var op = item[0];
    item[1].reject(err);
  }

  return this;
};


/**
 * Create a socket that can connect to the orientdb server.
 *
 * @return {Socket} The socket.
 */
Connection.prototype.createSocket = function() {
  var socket = net.createConnection(this.port, this.host);
  socket.setNoDelay(true);
  socket.setMaxListeners(100);
  return socket;
};

/**
 * Negotiate a connection to the server.
 *
 * @promise {Connection} The connection instance.
 */
Connection.prototype.negotiateConnection = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    self.logger.debug('negotiating connection to ' + self.host + ':' + self.port);
    self.socket.once('connect', function() {
      self.logger.debug('connected to ' + self.host + ':' + self.port);
      self.socket.removeAllListeners();
      self.negotiateProtocol(self.socket).done(resolve, reject);
    });

    self.socket.once('error', function(err) {
      self.logger.debug('connection error during negotiation: ' + err);
      self.socket.removeAllListeners();
      self.connecting = false;
      reject(new errors.Connection(err.code, err.message));
    });

    self.socket.once('close', function(err) {
      self.logger.debug('connection closed during negotiation: ' + err);
      self.socket.removeAllListeners();
      self.connecting = false;

      if(err) {
        reject(new errors.Connection(err.code, err.message));
      } else {
        reject(new errors.Connection(0, 'Socket Closed'));
      }
    });
  });
};

/**
 * Negotiate the orientdb server protocol.
 *
 * @promise {Connection} The connection instance.
 */
Connection.prototype.negotiateProtocol = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    self.socket.once('data', function(data) {
      self.socket.removeAllListeners('error');
      self.protocolVersion = data.readUInt16BE(0);
      self.logger.debug('server protocol: ' + self.protocolVersion);
      resolve(self);
      self.connecting = false;
      self.bindToSocket();
      self.emit('connect');

      if(data.length>2) {
        process.nextTick(function() {
          var remainingData = new Buffer(data.length - 2);
          data.copy(remainingData, 0, 2);
          if(remainingData.length) {
            self.handleSocketData(remainingData);
          }
        });
      }
      if(self.writes.length) {
        process.nextTick(function() {
          for(var g = 0; g<self.writes.length; g++) {
            self.socket.write(self.writes[g]);
          }

          self.writes = [];
        });
      }
    });

    self.socket.once('error', function(err) {
      self.connecting = false;
      self.logger.debug('error in protocol negotiation: ' + err);
      self.socket.removeAllListeners();
      reject(new errors.Connection(err.code, err.message));
    });
  });
};


/**
 * Bind to events on the socket.
 */
Connection.prototype.bindToSocket = function() {
  this.socket.on('data', this.handleSocketData.bind(this));
  this.socket.on('error', this.handleSocketError.bind(this));
  this.socket.on('close', this.handleSocketClose.bind(this));
  this.socket.on('end', this.handleSocketEnd.bind(this));
};


/**
 * Handle a chunk of data from the socket and attempt to process it.
 *
 * @param  {Buffer} data The data received from the server.
 */
Connection.prototype.handleSocketData = function(data) {
  var buffer, offset;

  if(this.remaining) {
    buffer = new Buffer(this.remaining.length + data.length);
    this.remaining.copy(buffer);
    data.copy(buffer, this.remaining.length);
  } else {
    buffer = data;
  }

  offset = this.process(buffer);

  if(buffer.length - offset === 0) {
    this.remaining = null;
  } else {
    this.remaining = buffer.slice(offset);
  }
};

/**
 * Handle a socket error event.
 *
 * @param  {Error} err The error object.
 */
Connection.prototype.handleSocketError = function(err) {
  err = new errors.Connection(2, err ? (err.message || err) : 'Socket Error.');
  this.cancel(err);
  this.destroySocket();
  this.emit('error', err);
};

/**
 * Handle a socket end event.
 *
 * @param  {Error} err The error object, if any.
 */
Connection.prototype.handleSocketEnd = function(err) {
  if(this.closing) {
    this.closing = false;
    this.destroySocket();
    return;
  }

  err = new errors.Connection(1, err || 'Remote server closed the connection.');

  this.cancel(err);
  this.destroySocket();
  this.emit('error', err);
};

/**
 * Handle a socket close event.
 *
 * @param  {Error} err The error object, if any.
 */
Connection.prototype.handleSocketClose = function(err) {
  this.cancel(new errors.Connection(3, err || 'Connection Closed.'));
  this.destroySocket();
  this.emit('close');
};

/**
 * Unbind from the socket events and destroy it.
 */
Connection.prototype.destroySocket = function() {
  this.socket.removeAllListeners();
  delete this.socket;
  this.connecting = false;
};

/**
 * Process the operations in the queue against the given buffer.
 *
 *
 * @param  {Buffer}  buffer The buffer to process.
 * @param  {Number} offset The offset to start processing from, defaults to 0.
 * @return {Number}        The offset that was successfully read up to.
 */
Connection.prototype.process = function(buffer, offset) {
  offset = offset || 0;

  while(this.queue.length) {
    var item = this.queue.shift(),
      op = item[0],
      deferred = item[1],
      parsed = op.consume(buffer, offset),
      status = parsed[0],
      result = parsed[2];

    offset = parsed[1];

    if(status === Operation.READING) {
      // Operation is incomplete, buffer does not contain enough data
      this.queue.unshift(item);
      return offset;
    }
    else if(status === Operation.PUSH_DATA) {
      this.emit('update-config', result);
      this.queue.unshift(item);
      return offset;
    }
    else if(status === Operation.COMPLETE) {
      deferred.resolve(result);
    }
    else if(status === Operation.ERROR) {
      if(result.status.error) {
        // this is likely a recoverable error
        deferred.reject(result.status.error);
      } else {
        // cannot recover, reject everything and let the application decide what to do
        var err = new errors.Protocol('Unknown Error on operation id ' + op.id, result);
        deferred.reject(err);
        this.cancel(err);
        this.emit('error', err);
      }
    } else {
      deferred.reject(new errors.Protocol('Unsupported operation status: ' + status));
    }
  }

  return offset;
};