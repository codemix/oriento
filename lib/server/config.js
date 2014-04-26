'use strict';

/**
 * Get a configuration value from the server.
 *
 * @param   {String} key The configuration key to get.
 * @promise {String}     The configuration value.
 */
exports.get = function(key) {
  return this.send('config-get', {
    key: key
  })
    .then(function(response) {
      return response.value;
    });
};

/**
 * Set a configuration value on the server.
 *
 * @param   {String} key   The configuration key to set.
 * @param   {String} value The new value.
 * @promise {String}       The configuration value.
 */
exports.set = function(key, value) {
  return this.send('config-set', {
    key: '' + key,
    value: '' + value
  })
    .then(function() {
      return value;
    });
};

/**
 * List the configuration for the server.
 *
 * @promise {Object} The configuration object.
 */
exports.list = function() {
  return this.send('config-list')
    .then(function(response) {
      var config = {};

      for(var g = 0; g<response.total; g++) {
        config[response.items[g].key] = response.items[g].value;
      }

      return config;
    });
};
