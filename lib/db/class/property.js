'use strict';

var Promise = require('bluebird'),
  utils = require('../../utils'),
  errors = require('../../errors');

/**
 * The property constructor.
 * @param {Object} config The configuration for the property
 */
function Property(config) {
  config = config || {};

  if(!(this instanceof Property)) {
    return new Property(config);
  }

  this.augment('custom', require('./custom'));
  this.configure(config);
}

Property.prototype.augment = utils.augment;
module.exports = exports = Property;

/**
 * Configure the property instance.
 * @param  {Object} config The configuration object.
 */
Property.prototype.configure = function(config) {
  this.class = config.class;
  this.name = config.name || '';
  this.originalName = this.name;
  this.type = config.type;
  this.mandatory = config.mandatory || false;
  this.readonly = config.readonly || false;
  this.notNull = config.notNull || false;
  this.collate = config.collate || 'default';
  this.min = config.min || null;
  this.max = config.max || null;
  this.regexp = config.regexp || null;
  this.linkedClass = config.linkedClass || null;

  if(config.custom && config.custom.fields) {
    this.custom.fields = config.custom.fields;
  }
  else if(config.customFields) {
    this.custom.fields = config.customFields;
  }
};

/**
 * Reload the property instance.
 *
 * @promise {Property} The property instance.
 */
Property.prototype.reload = function() {
  var self = this;

  return self.class.reload()
    .then(function(item) {
      return item.property.get(self.originalName, true);
    })
    .then(function(item) {
      self.configure(item);
      return self;
    });
};

/**
 * Rename the property instance.
 *
 * @promise {Property} The property instance.
 */
Property.prototype.rename = function(newName) {
  var self = this;

  return self.class.property.rename(self.originalName, newName)
    .then(function(item) {
      self.configure(item);
      return self;
    });
};


/**
 * List all the properties in the class.
 *
 * @promise {Object[]} The class properties
 */
Property.list = function() {
  return Promise.resolve(this.properties);
};

/**
 * Create a new property.
 *
 * @param  {String|Object} config The property name or configuration.
 * @param   {Boolean} reload      Whether to reload the property, default to true.
 * @promise {Object}              The created property.
 */
Property.create = function(config, reload) {
  var self = this;

  if(reload == null) {
    reload = true;
  }

  if(Array.isArray(config)) {
    return Promise.all(config.map(function(item) {
      return self.property.create(item, false);
    }, self))
      .then(function() {
        if(reload) {
          return self.reload();
        } else {
          return self;
        }
      })
      .then(function() {
        var promises = [];

        for(var g = 0; g<config.length; g++) {
          var name = config[g].name || config[g];
          promises.push(self.property.get(name));
        }
        return Promise.all(promises);
      });
  }

  var query = 'CREATE PROPERTY ' + self.name + '.';

  if(typeof config === 'string') {
    config = {
      name: config
    };
  }

  config.type = config.type || 'string';
  query += config.name + ' ' + config.type;

  if(config.linkedClass || config.linkedType) {
    query += ' ' + (config.linkedClass || config.linkedType);
    delete config.linkedClass;
    delete config.linkedType;
  }

  return self.db.exec(query)
    .then(function() {
      var total = Object.keys(config).length;

      if(total === 2) {
        // only name and type are set,
        // we can avoid the update
        return reload ? self.reload() : self;
      } else {
        delete config.type;
        return self.property.update(config, reload);
      }
    })
    .then(function() {
      return self.property.get(config.name);
    });
};

/**
 * Get the property with the given name.
 *
 * @param   {String} name   The property to get.
 * @promise {Object|null}   The retrieved property.
 */
Property.get = function(name) {
  for(var g = 0; g<this.properties.length; g++) {
    var item = this.properties[g];

    if(item.name === name) {
      return Promise.resolve(item);
    }
  }

  return Promise.resolve(null);
};

/**
 * Update the given property.
 *
 * @param   {Object}  property The property settings.
 * @param   {Boolean} reload   Whether to reload the property, default to true.
 * @promise {Object}           The updated property.
 */
Property.update = function(property, reload) {
  var self = this,
    promises = [],
    prefix = 'ALTER PROPERTY ' + self.name + '.' + property.name + ' ';

  if(reload == null) {
    reload = true;
  }

  if(property.linkedClass !== undefined) {
    promises.push(self.db.exec(prefix + 'LINKEDCLASS ' + property.linkedClass));
  }
  if(property.linkedType !== undefined) {
    promises.push(self.db.exec(prefix + 'LINKEDTYPE ' + property.linkedType));
  }
  if(property.min !== undefined) {
    promises.push(self.db.exec(prefix + 'MIN ' + property.min));
  }
  if(property.max !== undefined) {
    promises.push(self.db.exec(prefix + 'MAX ' + property.max));
  }
  if(property.regexp !== undefined) {
    promises.push(self.db.exec(prefix + 'REGEXP ' + property.regexp));
  }
  if(property.type !== undefined) {
    promises.push(self.db.exec(prefix + 'TYPE ' + property.type));
  }
  if(property.mandatory !== undefined) {
    promises.push(self.db.exec(prefix + 'MANDATORY ' + (property.mandatory ? 'true' : 'false')));
  }
  if(property.notNull !== undefined) {
    promises.push(self.db.exec(prefix + 'NOTNULL ' + (property.notNull ? 'true' : 'false')));
  }

  if(property.custom) {
    var keys = Object.keys(property.custom);

    for(var g = 0; g<keys.length; g++) {
      var key = keys[g];
      promises.push(self.db.exec(prefix + 'CUSTOM ' + key + ' = ' + property.custom[key]));
    }
  }

  return Promise.all(promises)
    .then(function() {
      if(reload) {
        return self.reload();
      }
    })
    .then(function() {
      return self.property.get(property.name);
    });
};

/**
 * Drop the given property.
 *
 * @param   {String} name The property name.
 * @promise {Class}       The class instance with property removed.
 */
Property.delete = function(name) {
  var self = this;

  return self.db.exec('DROP PROPERTY ' + self.name + '.' + name)
    .then(function() {
      return self.reload();
    });
};

/**
 * Alter the given property.
 *
 * @param   {String} name    The name of the property to alter.
 * @param   {String} setting The property setting.
 * @promise {Class}          The class instance with property altered.
 */
Property.alter = function(name, setting) {
  var self = this;

  return self.db.exec('ALTER PROPERTY ' + self.name + '.' + name + ' ' + setting)
    .then(function() {
      return self.reload();
    })
    .return(self);
};

/**
 * Rename a proprerty.
 *
 * @param   {String} oldName The existing name of the property.
 * @param   {String} newName The new name for the property.
 * @promise {Object}         The renamed property instance.
 */
Property.rename = function(oldName, newName) {
  var self = this;

  return self.db.exec('ALTER PROPERTY ' + self.name + '.' + oldName + ' NAME ' + newName)
    .then(function() {
      return self.reload();
    })
    .then(function() {
      return self.property.get(newName);
    });
};