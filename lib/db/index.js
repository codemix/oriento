'use strict';

var utils = require('../utils'),
  errors = require('../errors'),
  Promise = require('bluebird'),
  RID = require('../recordid'),
  Query = require('./query');


/**
 * Database Constructor.
 *
 * @param {Object} config The optional configuration for the database.
 */
function Db(config) {
  if(!config) {
    throw new errors.Config('Database object requires configuration');
  }

  this.configure(config);
  this.init();
  this.augment('cluster', require('./cluster'));
  this.augment('class', require('./class'));
  this.augment('record', require('./record'));
  this.augment('vertex', require('./vertex'));
  this.augment('edge', require('./edge'));
  this.augment('index', require('./index/index'));
}


Db.prototype.augment = utils.augment;
Db.extend = utils.extend;

module.exports = Db;

/**
 * Configure the database instance.
 * @param  {Object} config The configuration for the database.
 * @return {Db}            The configured database object.
 */
Db.prototype.configure = function(config) {
  this.sessionId = config.sessionId !== null && typeof config.sessionId !== 'undefined' ? config.sessionId : -1;
  this.name = config.name;

  this.server = config.server;
  this.type = config.type === 'document' ? 'document' : 'graph';
  this.storage = (config.storage === 'plocal' || config.storage === 'memory') ? config.storage : 'plocal';

  this.username = config.username || 'admin';
  this.password = config.password || 'admin';
  this.dataSegments = [];
  this.transactionId = 0;
  return this;
};

/**
 * Initialize the database instance.
 */
Db.prototype.init = function() {

};

/**
 * Open the database.
 *
 * @promise {Db} The open db instance.
 */
Db.prototype.open = function() {
  var self = this;

  if(self.sessionId !== -1) {
    return Promise.resolve(self);
  }

  self.server.logger.debug('opening database connection to ' + self.name);

  return self.server.send('db-open', {
    name: self.name,
    type: self.type,
    username: self.username,
    password: self.password
  })
    .then(function(response) {
      self.server.logger.debug('got session id ' + response.sessionId + ' for database ' + self.name);
      self.sessionId = response.sessionId;
      self.cluster.cacheData(response.clusters);
      self.serverCluster = response.serverCluster;
      self.server.once('error', function() {
        self.sessionId = null;
      });
      return self;
    });
};

/**
 * Send the given operation to the server, ensuring the
 * database is open first.
 *
 * @param  {Integer} operation The operation to send.
 * @param  {Object} data       The data for the operation.
 * @promise {Mixed}            The result of the operation.
 */
Db.prototype.send = function(operation, data) {
  var self = this;

  return self.open()
    .then(function() {
      data = data || {};
      data.sessionId = self.sessionId;
      self.server.logger.debug('sending operation ' + operation + ' for database ' + self.name);
      return self.server.send(operation, data);
    });
};


/**
 * Reload the configuration for the database.
 *
 * @promise {Db}  The database with reloaded configuration.
 */
Db.prototype.reload = function() {
  var self = this;

  if(self.sessionId === -1) {
    return self.open();
  }

  self.server.logger.debug('Reloading database information');

  return self.send('db-reload')
    .then(function(response) {
      self.cluster.cacheData(response.clusters);
      return self;
    });
};


/**
 * Execute an SQL query against the database and retreive the raw, parsed response.
 *
 * @param   {String} query   The query or command to execute.
 * @param   {Object} options The options for the query / command.
 * @promise {Mixed}          The results of the query / command.
 */
Db.prototype.exec = function(query, options) {
  var data = {
    query: query,
    mode: 's',
    fetchPlan: '',
    limit: -1,
    class: 'com.orientechnologies.orient.core.sql.OCommandSQL'
  };
  options = options || {};

  if(options.fetchPlan && typeof options.fetchPlan === 'string') {
    data.fetchPlan = options.fetchPlan;
    data.mode = 'a';
  }

  if(options.limit == +options.limit) {
    data.limit = +options.limit;
    data.mode = 'a';
  }

  if(options.mode === 'a') {
    data.mode = options.mode;
  }

  if(data.mode === 'a') {
    data.class = 'com.orientechnologies.orient.core.sql.query.OSQLAsynchQuery';
  }

  if(options.params) {
    if(Array.isArray(options.params)) {
      // arrays get cast to simple objects
      data.params = {
        params: options.params.reduce(function(params, param, i) {
          params[i] = param;
          return params;
        }, {})
      };
    }
    else if(typeof options.params === 'object') {
      data.params = {
        params: options.params
      };
    }
  }

  this.server.logger.debug('executing query against db ' + this.name + ': ' + query);

  return this.send('command', data);
};

/**
 * Execute an SQL query against the database and retreive the results
 *
 * @param   {String} query   The query or command to execute.
 * @param   {Object} options The options for the query / command.
 * @promise {Mixed}          The results of the query / command.
 */
Db.prototype.query = function(command, options) {
  var self = this;

  return self.exec(command, options)
    .then(function(response) {
      if(response.results.length === 0) {
        return [];
      }

      return response.results
        .map(self.normalizeResult, self)
        .reduce(flatten, [])
        .reduce(function(list, item) {
          if(item && item['@preloaded']) {
            delete item['@preloaded'];
            list[1].push(item);
          }
          else {
            list[0].push(item);
          }
          return list;
        }, [
          [],
          []
        ]);
    })
    .spread(function(results, preloaded) {
      if(preloaded && preloaded.length) {
        return results.map(function(result) {
          if(result && result['@rid']) {
            return self.record.resolveReferences(result, preloaded);
          }
          else {
            return result;
          }
        }, self);
      } else {
        return results;
      }
    });
};

/**
 * Normalize a result, where possible.
 * @param  {Object} result The result to normalize.
 * @return {Object}        The normalized result.
 */
Db.prototype.normalizeResult = function(result) {
  var value;

  if(!result) {
    return result;
  }

  if(Array.isArray(result)) {
    return result.map(this.normalizeResult, this);
  }

  if(result.type === 'r' || result.type === 'f') {
    return this.normalizeResultContent(result.content, this);
  }
  else if(result.type === 'p') {
    value = this.normalizeResultContent(result.content, this);
    value['@preloaded'] = true;
    return value;
  }
  else if(result.type === 'l') {
    return result.content.map(this.normalizeResultContent, this);
  } else {
    return result;
  }
};

/**
 * Normalize the content for a result.
 * @param  {Mixed} content The content to normalize.
 * @return {Mixed}         The normalized content.
 */
Db.prototype.normalizeResultContent = function(content) {
  var value;
  if(!content) {
    return null;
  }

  if(Array.isArray(content)) {
    return content.map(this.normalizeResultContent, this);
  }

  if(content.type === 'd') {
    value = content.value || {};
    value['@rid'] = new RID({
      cluster: content.cluster,
      position: content.position
    });
    return value;
  }
  else {
    return content;
  }
};

// # Query Builder Methods

/**
 * Create a query instance for this database.
 *
 * @return {Query} The query instance.
 */
Db.prototype.createQuery = function() {
  return new Query(this);
};

/**
 * Create a select query.
 *
 * @return {Query} The query instance.
 */
Db.prototype.select = function() {
  var query = this.createQuery();
  return query.select.apply(query, arguments);
};

/**
 * Create a traverse query.
 *
 * @return {Query} The query instance.
 */
Db.prototype.traverse = function() {
  var query = this.createQuery();
  return query.traverse.apply(query, arguments);
};


/**
 * Create an insert query.
 *
 * @return {Query} The query instance.
 */
Db.prototype.insert = function() {
  var query = this.createQuery();
  return query.insert.apply(query, arguments);
};


/**
 * Create an update query.
 *
 * @return {Query} The query instance.
 */
Db.prototype.update = function() {
  var query = this.createQuery();
  return query.update.apply(query, arguments);
};

/**
 * Create a delete query.
 *
 * @return {Query} The query instance.
 */
Db.prototype.delete = function() {
  var query = this.createQuery();
  return query.delete.apply(query, arguments);
};

/**
 * Escape the given input.
 *
 * @param  {String} input The input to escape.
 * @return {String}       The escaped input.
 */
Db.prototype.escape = function(input) {
  return ('' + input).replace(/([^'\\]*(?:\\.[^'\\]*)*)'/g, '$1\\"');
};

/**
 * Flatten an array of arrays
 */
function flatten(list, item) {
  if(Array.isArray(item)) {
    return item.reduce(flatten, list);
  }
  else {
    list.push(item);
  }
  return list;
}