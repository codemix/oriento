'use strict';

var Promise = require('bluebird'),
  Property = require('./property'),
  RID = require('../../recordid'),
  utils = require('../../utils'),
  errors = require('../../errors');

/**
 * The class constructor.
 * @param {Object} config The configuration for the class
 */
function Class(config) {
  config = config || {};

  if(!(this instanceof Class)) {
    return new Class(config);
  }

  this.augment('property', Property);
  this.augment('custom', require('./custom'));
  this.configure(config);
}

Class.prototype.augment = utils.augment;
module.exports = exports = Class;

/**
 * Configure the class instance.
 * @param  {Object} config The configuration object.
 */
Class.prototype.configure = function(config) {
  this.db = config.db;
  this.name = config.name || '';
  this.shortName = config.shortName || null;
  this.defaultClusterId = config.defaultClusterId || null;
  this.clusterIds = config.clusterIds || [];
  this.properties = (config.properties || []).map(function(item) {
    item.class = this;
    return new Property(item);
  }, this);
  this.superClass = config.superClass || null;
  this.originalName = this.name;

  if(config.custom && config.custom.fields) {
    this.custom.fields = config.custom.fields;
  }
  else if(config.customFields) {
    this.custom.fields = config.customFields;
  }
};


/**
 * Return a list of records in the class.
 *
 * @param  {Number|Object} limit  The maximum number of records to return, or a configuration object.
 * @param  {Number} offset The offset to start returning records from.
 * @promise {Object[]}      An array of records in the class.
 */
Class.prototype.list = function(limit, offset) {
  var query = 'SELECT * FROM ' + this.name,
    config = {};

  if(limit && typeof limit === 'object') {
    config = limit;
    limit = config.limit;
    offset = config.offset;
  }

  limit = +limit || 20;
  offset = +offset || 0;

  if(limit !== Infinity) {
    query += ' LIMIT ' + limit + ' OFFSET ' + offset;
  } else {
    query += ' OFFSET ' + offset;
  }

  return this.db.query(query, config);
};

/**
 * Find a list of records in the class.
 *
 * @param  {Object}  attributes The attributes to search with.
 * @param  {Number} limit      The maximum number of records to return
 * @param  {Number} offset     The offset to start returning records from.
 * @promise {Object[]}          An array of records in the class.
 */
Class.prototype.find = function(attributes, limit, offset) {
  var query = 'SELECT * FROM ' + this.name,
    keys = Object.keys(attributes),
    conditions = [],
    params = {};

  for(var g = 0; g<keys.length; g++) {
    var key = keys[g],
      value = attributes[key],
      sanitizedKey = key.replace(/\./g, '_');

    params[sanitizedKey] = value;
    conditions.push(key + ' = :' + sanitizedKey);
  }

  if(conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  limit = +limit || 20;
  offset = +offset || 0;

  if(limit !== Infinity) {
    query += ' LIMIT ' + limit + ' OFFSET ' + offset;
  } else {
    query += ' OFFSET ' + offset;
  }

  return this.db.query(query, {
    params: params
  });
};


/**
 * Create a record for this class.
 *
 * @param   {Object} record The record to create.
 * @promise {Object}        The created record.
 */
Class.prototype.create = function(record) {
  if(Array.isArray(record)) {
    return Promise.map(record, this.create.bind(this));
  }

  record['@class'] = this;

  return this.db.record.create(record)
    .then(function(record) {
      delete record['@class'];
      return record;
    });
};

/**
 * Reload the class instance.
 *
 * @promise {Class} The class instance.
 */
Class.prototype.reload = function() {
  var self = this;

  return self.db.class.get(self.originalName, true)
    .then(function(item) {
      self.configure(item);
      return self;
    });
};

/**
 * Static methods.
 * These methods are invoked with the database instance as `this`, not `Class`!
 */

/**
 * The cached class items.
 * @type {Object|false}
 */
exports.cached = false;

/**
 * Retreive a list of classes from the database.
 *
 * @param  {Boolean} refresh Whether to refresh the list or not.
 * @promise {Object[]}       An array of class objects.
 */
exports.list = function(refresh) {
  var self = this;

  if(!refresh && self.class.cached) {
    return Promise.resolve(self.class.cached.items);
  }

  return self.send('record-load', {
      cluster: 0,
      position: 1
    })
    .then(function(response) {
      var record = response.records[0];
      if(!record || !record.classes) {
        return [];
      } else {
        return record.classes;
      }
    })
    .then(self.class.cacheData)
    .then(function() {
      return self.class.cached.items;
    });
};

/**
 * Create a new class.
 *
 * @param  {String} name           The name of the class to create.
 * @param  {String} parentName     The name of the parent to extend, if any.
 * @param  {String|Number} cluster The cluster name or id.
 * @promise {Object}               The created class object
 */
exports.create = function(name, parentName, cluster) {
  var self = this;
  var query = 'CREATE CLASS ' + name;

  if(parentName) {
    query += ' EXTENDS ' + parentName;
  }

  if(cluster) {
    query += ' CLUSTER ' + cluster;
  }

  return self.query(query)
    .then(function() {
      return self.class.list(true);
    })
    .then(function() {
      return self.class.get(name);
    });
};


/**
 * Delete a class.
 *
 * @param  {String} name The name of the class to delete.
 * @promise {Db}         The database instance.
 */
exports.delete = function(name) {
  var self = this;

  return self.exec('DROP CLASS ' + name)
    .then(function() {
      return self.class.list(true);
    })
    .then(function() {
      return self;
    });
};


/**
 * Get a class by name.
 *
 * @param   {Number|String} name The name of the class.
 * @param   {Boolean} refresh Whether to refresh the data, defaults to false.
 * @promise {Object}          The class object if it exists.
 */
exports.get = function(name, refresh) {
  var self = this;

  if(!refresh && self.class.cached && self.class.cached.names[name]) {
    return Promise.resolve(self.class.cached.names[name]);
  }
  else if(!self.class.cached || refresh) {
    return self.class.list(refresh)
      .then(function() {
        return self.class.cached.names[name] || Promise.reject(new errors.Request('No such class: ' + name));
      });
  } else {
    return Promise.reject(new errors.Request('No such class: ' + name));
  }
};

/**
 * Cache the given class data for fast lookup later.
 *
 * @param  {Object[]} classes The class objects to cache.
 * @return {Db}                The db instance.
 */
exports.cacheData = function(classes) {
  classes = classes.map(function(item) {
    item.db = this;
    return new Class(item);
  }, this);


  this.class.cached = {
    names: {},
    items: classes
  };

  for(var g = 0; g<classes.length; g++) {
    var item = classes[g];
    this.class.cached.names[item.name] = item;
  }

  return this;
};