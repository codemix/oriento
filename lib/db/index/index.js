'use strict';

var Promise = require('bluebird'),
  utils = require('../../utils'),
  errors = require('../../errors'),
  RID = require('../../recordid');

/**
 * The index constructor.
 * @param {Object} config The configuration for the index
 */
function Index(config) {
  config = config || {};

  if(!(this instanceof Index)) {
    return new Index(config);
  }

  this.configure(config);
}

module.exports = exports = Index;

/**
 * Configure the index instance.
 * @param  {Object} config The configuration object.
 */
Index.prototype.configure = function(config) {
  this.db = config.db;
  this.name = config.name || '';
  this.type = config.type || null;
  this.definition = config.indexDefinition || null;
  this.definitionClass = config.indexDefinitionClass || null;
  this.clusters = config.clusters || [];
  this.mapRid = config.mapRid || null;
  this.algorithm = config.algorithm || null;
  this.valueContainerAlgorithm = config.valueContainerAlgorithm || 'NONE';
};

/**
 * Add the given item(s) to the index.
 *
 * @param   {Object|Object[]} args The item(s) to add.
 * @promise {Object[]}              The added items.
 */
Index.prototype.add = function(args) {
  var self = this;

  if(!Array.isArray(args)) {
    args = Array.prototype.slice.call(arguments);
  }

  return Promise.map(args, function(item) {
    return self.db.query('INSERT INTO index:' +
      self.name + ' (key, rid) VALUES ("' + self.db.escape(item.key) + '", ' + self.db.escape(item.rid) + ')');
  });
};

/**
 * Get the value of the given key
 *
 * @param   {String}   key   The key to get.
 * @promise {RID}            The result.
 */
Index.prototype.get = function(key) {
  return this.db.query('SELECT FROM index:' + this.name + ' WHERE key = "' + this.db.escape(key) + '"')
    .then(function(results) {
      return results[0];
    });
};


/**
 * Set the given key to the given value.
 *
 * @param   {String}     key   The key to set.
 * @param   {String|RID} value The record id.
 * @promise {Index}            The index object.
 */
Index.prototype.set = function(key, value) {
  return this.db.query('INSERT INTO index:' +
    this.name + ' (key, rid) VALUES ("' + this.db.escape(key) + '", ' + this.db.escape(value['@rid'] || value) + ')')
    .return(this);
};

/**
 * Delete the given rid from the index.
 *
 * @param   {String}     rid   The rid to delete.
 * @promise {Index}            The index object.
 */
Index.prototype.delete = function(rid) {
  return this.db.query('DELETE FROM index:' + this.name + ' WHERE rid = ' + rid)
    .return(this);
};


/**
 * Select from this index.
 * @return {Query} The query object.
 */
Index.prototype.select = function() {
  return this.db.select.apply(this.db, arguments)
    .from('index:' + this.name);
};


/**
 * Static methods.
 * These methods are invoked with the database instance as `this`, not `Index`!
 */

/**
 * The cached index items.
 * @type {Object|false}
 */
Index.cached = false;

/**
 * Retreive a list of indices from the database.
 *
 * @param  {Boolean} refresh Whether to refresh the list or not.
 * @promise {Object[]}       An array of index objects.
 */
Index.list = function(refresh) {
  var self = this;

  if(!refresh && self.index.cached) {
    return Promise.resolve(self.index.cached.items);
  }

  return this.send('record-load', {
    cluster: 0,
    position: 2
  })
    .then(function(response) {
      var record = response.records[0];
      if(!record || !record.indexes) {
        return [];
      } else {
        return record.indexes;
      }
    })
    .then(self.index.cacheData)
    .then(function() {
      return self.index.cached.items;
    });
};

/**
 * Create a new index.
 *
 * @param  {Object} config  The configuration for the index.
 * @promise {Object}        The created index object.
 */
Index.create = function(config) {
  var self = this,
    query = 'CREATE INDEX ' + config.name;

  if(config.class) {
    query += ' ON ' + config.class;
  }
  if(config.properties) {
    if(Array.isArray(config.properties)) {
      query += ' (' + config.properties.join(', ') + ')';
    }
    else {
      query += ' (' + config.properties + ')';
    }
  }

  query += ' ' + config.type;

  if(config.keyType) {
    query += ' ' + config.keyType;
  }

  return self.query(query)
    .then(function() {
      return self.index.list(true);
    })
    .then(function() {
      return self.index.get(config.name);
    });
};


/**
 * Delete an index.
 *
 * @param  {String} name The name of the index to delete.
 * @promise {Db}         The database instance.
 */
Index.delete = function(name) {
  var self = this;

  return self.exec('DROP INDEX ' + name)
    .then(function() {
      return self.index.list(true);
    })
    .return(self);
};


/**
 * Get an index by name.
 *
 * @param   {Number|String} name The name of the index.
 * @param   {Boolean} refresh Whether to refresh the data, defaults to false.
 * @promise {Object}          The index object if it exists.
 */
Index.get = function(name, refresh) {
  var self = this;

  if(!refresh && self.index.cached && self.index.cached.names[name]) {
    return Promise.resolve(self.index.cached.names[name]);
  }
  else if(!self.index.cached || refresh) {
    return self.index.list(refresh)
      .then(function() {
        return self.index.cached.names[name] || Promise.reject(new errors.Request('No such index: ' + name));
      });
  } else {
    return Promise.reject(new errors.Request('No such index: ' + name));
  }
};

/**
 * Cache the given index data for fast lookup later.
 *
 * @param  {Object[]} indices The index objects to cache.
 * @return {Db}                The db instance.
 */
Index.cacheData = function(indices) {
  indices = indices.map(function(item) {
    item.db = this;
    return new Index(item);
  }, this);


  this.index.cached = {
    names: {},
    items: indices
  };

  for(var g = 0; g<indices.length; g++) {
    var item = indices[g];
    this.index.cached.names[item.name] = item;
  }

  return this;
};