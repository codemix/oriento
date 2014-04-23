'use strict';

var RID = require('../../recordid');

// db.edge.from('#1:1').to('#2:1').create('Foo')

/**
 * Start from the given vertex or group of vertices.
 *
 * @param  {Mixed} from The vertex or vertices to start from.
 * @return {Object}     The fluent API object.
 */
exports.from = function(from) {
  return fluent.call(this, {
    from: from
  });
};


/**
 * End at the given vertex or group of vertices.
 *
 * @param  {Mixed} from The vertex or vertices to end at.
 * @return {Object}     The fluent API object.
 */
exports.to = function(to) {
  return fluent.call(this, {
    to: to
  });
};


/**
 * Fluent API
 *
 * @param  {Object} args The named arguments.
 * @return {Object}      The object containing the fluent api methods.
 */
var fluent = function(args) {
  var self = this;

  args = args || {};
  return {
    to: function(to) {
      args.to = to;
      return fluent.call(self, args);
    },
    from: function(from) {
      args.from = from;
      return fluent.call(self, args);
    },
    create: function(config) {
      return createEdge(self, config, args.from, args.to);
    },
    delete: function(config) {
      return deleteEdge(self, config, args.from, args.to);
    }
  };
};

/**
 * Create an edge from one vertex or group of vertices to another.
 *
 * @param   {Db}     db     The database to use.
 * @param   {Object} config The edge class name or configuration
 * @param   {Mixed}  from   The vertex to start from.
 * @param   {Mixed}  to     The vertex to end at.
 * @promise {Object[]}      The created edges.
 */
function createEdge(db, config, from, to) {
  var command = 'CREATE EDGE',
    className, attributes;
  config = edgeConfig(config);
  className = config[0];
  attributes = config[1];
  command += ' ' + className + ' FROM ' + edgeReference(from) + ' TO ' + edgeReference(to);

  if(attributes) {
    command += ' CONTENT ' + JSON.stringify(attributes);
  }

  return db.query(command);
}


/**
 * Delete an edge from one vertex or group of vertices to another.
 *
 * @param   {Db}     db     The database to use.
 * @param   {Object} config The edge class name or configuration
 * @param   {Mixed}  from   The vertex to start from.
 * @param   {Mixed}  to     The vertex to end at.
 * @promise {Integer}       The number of deleted edges.
 */
function deleteEdge(db, config, from, to) {
  var command = 'DELETE EDGE',
    className = config ? edgeConfig(config)[0] : false;

  if(false && className) {
    command += ' ' + className;
  }

  command += ' FROM ' + edgeReference(from) + ' TO ' + edgeReference(to);

  return db.query(command)
    .then(function(response) {
      return +response || 0;
    });
}


/**
 * Extract the class name and edge configuration from the given string / object.
 *
 * @param  {String|Object} config  The configuration object or class name.
 * @return {[String, Object|undefined]}      The class name and any configuration object.
 */
function edgeConfig(config) {
  var className = 'E',
    obj;

  if(typeof config === 'string') {
    className = config;
  }
  else if(config && typeof config === 'object') {
    var keys = Object.keys(config);
    obj = {};

    for(var g = 0; g<keys.length; g++) {
      var key = keys[g];

      if(key.charAt(0) === '@') {
        continue;
      }

      obj[key] = config[key];
    }
    if(config['@class']) {
      className = config['@class'];
    }
  }

  return [className, obj];
}

/**
 * Extract an edge reference, which may be an SQL statement, an RID or a document containing one.
 *
 * @param  {Mixed}      ref  The refererence.
 * @return {RID|String}      The RID or extracted statement.
 */
function edgeReference(ref) {
  var rid;
  if(!ref) {
    return false;
  }
  else if(typeof ref === 'string') {
    // Could be either an sql statement or an RID
    rid = RID.parse(ref);

    if(rid) {
      return rid;
    } else {
      return '(' + ref + ')';
    }
  }
  else if(ref instanceof RID) {
    return ref;
  }
  else if(ref['@rid']) {
    return ref['@rid'];
  } else {
    return RID.parse(ref);
  }
}