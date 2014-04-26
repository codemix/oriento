'use strict';

var ConnectionPool = require('./connection-pool'),
  Connection = require('./connection'),
  utils = require('../../utils'),
  errors = require('../../errors'),
  Db = require('../../db/index'),
  Promise = require('bluebird'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter;

/**
 * # Binary Transport
 *
 * @param {Object} config The configuration for the transport.
 */
function BinaryTransport(config) {
  EventEmitter.call(this);
  this.setMaxListeners(Infinity);
  this.configure(config || {});
}

util.inherits(BinaryTransport, EventEmitter);

BinaryTransport.extend = utils.extend;
BinaryTransport.prototype.augment = utils.augment;
BinaryTransport.protocol = require('./protocol');

module.exports = BinaryTransport;


/**
 * Configure the transport.
 *
 * @param  {Object} config The transport configuration.
 */
BinaryTransport.prototype.configure = function(config) {
  this.connecting = false;
  this.closing = false;

  this.host = config.host || config.hostname || 'localhost';
  this.port = config.port || 2424;
  this.username = config.username || 'root';
  this.password = config.password || '';

  this.sessionId = -1;
  this.configureLogger(config.logger || {});

  if(config.pool) {
    this.configurePool(config.pool);
  } else {
    this.configureConnection();
  }
};

/**
 * Configure the logger for the transport.
 *
 * @param  {Object}          config  The logger config
 * @return {BinaryTransport}         The transport instance with the configured logger.
 */
BinaryTransport.prototype.configureLogger = function(config) {
  this.logger = {
    error: config.error || console.error.bind(console),
    log: config.log || console.log.bind(console),
    debug: config.debug || function() {
    } // do not log debug by default
  };
  return this;
};


/**
 * Configure a connection for the transport.
 *
 * @return {BinaryTransport} The transport instance with the configured connection.
 */
BinaryTransport.prototype.configureConnection = function() {
  var self = this;

  self.connection = new Connection({
    host: self.host,
    port: self.port,
    logger: self.logger
  });

  self.connection.on('update-config', function(config) {
    self.logger.debug('updating config...');
    self.transportCluster = config;
  });

  return self;
};

/**
 * Configure a connection pool for the transport.
 *
 * @param  {Object}          config The connection pool config
 * @return {BinaryTransport}        The transport instance with the configured connection pool.
 */
BinaryTransport.prototype.configurePool = function(config) {
  var self = this;

  self.pool = new ConnectionPool({
    host: self.host,
    port: self.port,
    logger: self.logger,
    max: config.max
  });

  self.pool.on('update-config', function(config) {
    self.logger.debug('updating config...');
    self.serverCluster = config;
  });

  return self;
};


/**
 * Connect to the server.
 *
 * @promise {BinaryTransport} The connected transport instance.
 */
BinaryTransport.prototype.connect = function() {
  var self = this;

  if(self.sessionId !== -1) {
    return Promise.resolve(self);
  }

  if(self.connecting) {
    return self.connecting;
  }

  self.connecting = (self.pool || self.connection).send('connect', {
      username: self.username,
      password: self.password
    })
    .then(function(response) {
      self.logger.debug('got session id: ' + response.sessionId);
      self.sessionId = response.sessionId;
      return self;
    });

  return self.connecting;
};

/**
 * Send an operation to the server,
 *
 * @param  {Integer} operation The id of the operation to send.
 * @param  {Object} options    The options for the operation.
 * @promise {Mixed}            The result of the operation.
 */
BinaryTransport.prototype.send = function(operation, options) {
  options = options || {};
  var self = this;

  if(~self.sessionId || options.sessionId != null) {
    options.sessionId = options.sessionId != null ? options.sessionId : self.sessionId;
    return (self.pool || self.connection).send(operation, options);
  } else {
    return self.connect()
      .then(function(server) {
        options.sessionId = options.sessionId != null ? options.sessionId : self.sessionId;
        return (server.pool || server.connection).send(operation, options);
      });
  }
};


/**
 * Close the connection to the server.
 *
 * @return {Server} the disconnected server instance
 */
BinaryTransport.prototype.close = function() {
  if(!this.closing && this.socket) {
    this.closing = false;
    this.sessionId = -1;
  }
  return this;
};