'use strict';

var Promise = require('bluebird'),
  errors = require('../errors');

/**
 * The cached cluster items.
 * @type {Object|false}
 */
exports.cached = false;

/**
 * Retreive a list of clusters from the database.
 *
 * @param  {Boolean} refresh Whether to refresh the list or not.
 * @promise {Object[]}       An array of cluster objects.
 */
exports.list = function(refresh) {
  var self = this;

  if(!refresh && self.cluster.cached) {
    return Promise.resolve(self.cluster.cached.items);
  }

  if(self.sessionId) {
    // db is already open, reload
    return self.reload()
      .then(function() {
        // reload calls `cacheData`
        return self.cluster.cached.items;
      });
  } else {
    return self.open()
      .then(function() {
        // open calls `cacheData`
        return self.cluster.cached.items;
      });
  }
};

/**
 * Create a new cluster.
 *
 * @param   {String} name      The name of the cluster.
 * @param   {String} location  The location of the cluster.
 * @promise {Object}           The cluster object.
 */
exports.create = function(name, location) {
  var self = this;

  return self.send('datacluster-add', {
    name: name,
    location: location || 'physical'
  })
    .then(function() {
      return self.reload();
    })
    .then(function() {
      return self.cluster.getByName(name);
    });
};

/**
 * Get a cluster by name or id.
 *
 * @param   {Number|String} nameOrId The name or id of the cluster.
 * @param   {Boolean} refresh Whether to refresh the data, defaults to false.
 * @promise {Object}          The cluster object if it exists.
 */
exports.get = function(nameOrId, refresh) {
  if(nameOrId == +nameOrId) {
    return this.cluster.getById(nameOrId, refresh);
  } else {
    return this.cluster.getByName(nameOrId, refresh);
  }
};

/**
 * Get a cluster by name
 *
 * @param   {String}  name    The name of the cluster.
 * @param   {Boolean} refresh Whether to refresh the data, defaults to false.
 * @promise {Object}          The cluster object if it exists.
 */
exports.getByName = function(name, refresh) {
  var self = this;

  name = name.toLowerCase();
  if(!refresh && self.cluster.cached && self.cluster.cached.names[name]) {
    return Promise.resolve(self.cluster.cached.names[name]);
  }
  else if(!self.cluster.cached || refresh) {
    return self.cluster.list(refresh)
      .then(function() {
        return self.cluster.cached.names[name];
      });
  } else {
    return Promise.resolve(undefined);
  }
};

/**
 * Get a cluster by id
 *
 * @param   {String}  id      The id of the cluster.
 * @param   {Boolean} refresh Whether to refresh the data, defaults to false.
 * @promise {Object}          The cluster object if it exists.
 */
exports.getById = function(id, refresh) {
  var self = this;

  if(!refresh && self.cluster.cached && self.cluster.cached.ids[id]) {
    return Promise.resolve(self.cluster.cached.ids[id]);
  }
  else if(!self.cluster.cached || refresh) {
    return self.cluster.list(refresh)
      .then(function() {
        return self.cluster.cached.ids[id];
      });
  } else {
    return Promise.resolve(undefined);
  }
};

/**
 * Delete a cluster.
 *
 * @param   {String} nameOrId  The name or id of the cluster.
 * @promise {Db}               The database.
 */
exports.delete = function(nameOrId) {
  var self = this;

  return self.cluster.get(nameOrId)
    .then(function(cluster) {
      if(!cluster) {
        throw new errors.Operation('Cannot delete a data cluster that does not exist!');
      }
      return self.send('datacluster-drop', {
        id: cluster.id
      });
    })
    .then(function() {
      return self.reload();
    });
};

/**
 * Count the records in a cluster
 *
 * @param   {String} nameOrId  The name of the cluster.
 * @promise {Integer}          The number of records in the cluster.
 */
exports.count = function(nameOrId) {
  var self = this;

  return this.cluster.get(nameOrId)
    .then(function(cluster) {
      return self.send('datacluster-count', {
        id: cluster.id
      });
    })
    .then(function(response) {
      return response.count;
    });
};

/**
 * Get the range of records in a cluster
 *
 * @param   {String} nameOrId The name of the cluster.
 * @promise {Object}          The object containing the start and end values.
 */
exports.range = function(nameOrId) {
  var self = this;

  return self.cluster.get(nameOrId)
    .then(function(cluster) {
      return self.send('datacluster-datarange', {
        id: cluster.id
      });
    })
    .then(function(response) {
      return {
        start: response.begin,
        end: response.end
      };
    });
};

/**
 * Cache the given cluster data for fast lookup later.
 *
 * @param  {Object[]} clusters The cluster objects to cache.
 * @return {Db}                The db instance.
 */
exports.cacheData = function(clusters) {
  this.cluster.cached = {
    ids: {},
    names: {},
    items: clusters
  };

  for(var g = 0; g<clusters.length; g++) {
    var item = clusters[g];
    this.cluster.cached.ids[item.id] = item;
    this.cluster.cached.names[item.name] = item;
  }

  return this;
};