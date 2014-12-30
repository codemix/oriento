import AbstractTransport from '../abstract';
import {NotImplementedError, RequestError} from '../../errors';
import Bluebird from 'bluebird';
import request from 'request';
import {createJSON as createJSONFormat} from './serialization-formats';

import {state} from '../symbols';

const makeRequest = Bluebird.promisify(request);

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 2480;

/**
 * # REST Transport
 */
class RESTTransport extends AbstractTransport {
  /**
   * Configure the transport.
   *
   * @param {Options} options The client options.
   */
  constructor (options) {
    this[state] = {
      host: options.host || DEFAULT_HOST,
      port: options.port || DEFAULT_PORT,
      username: options.username,
      password: options.password,
      useToken: options.useToken,
      database: options.database,
      token: options.token || null
    };

    let format = createJSONFormat({}); // @fixme classes!
    this.serialize = format.serialize;
    this.deserialize = format.deserialize;
  }

  /**
   * The base URL for the server (with trailing slash).
   * @type {String}
   */
  get baseURL () {
    return `http://${this.host}:${this.port}/`;
  }


  /**
   * List the databases on the server.
   * @promise {Object[]} The databases on the server.
   */
  listDatabases () {
    if (this[state].database) {
      throw new Error('Cannot call `listDatabases()` when connected to a database.');
    }
    return send(this, {
      url: 'listDatabases',
      method: 'GET'
    })
    .then(response => response['@value'].databases.reduce((dbs, name) => {
      dbs[name] = {
        name: name
      };
      return dbs;
    }, {}));
  }

  /**
   * Create a database with the given name.
   *
   * @param   {String} name    The name of the database to create.
   * @param   {String} storage The database storage type, defaults to `"plocal"`.
   * @promise {String}         The name of the created database.
   */
  createDatabase (name, storage = 'plocal') {
    if (this[state].database) {
      throw new Error('Cannot call `createDatabase()` when connected to a database.');
    }
    return send(this, {
      url: `database/${name}/${storage}/graph`,
      method: 'POST'
    })
    .return(name);
  }

  /**
   * See if a database exists with the given name.
   *
   * @param   {String} name    The name of the database to check.
   * @promise {Boolean}        `true` if the database exists.
   */
  hasDatabase (name) {
    if (this[state].database) {
      throw new Error('Cannot call `hasDatabase()` when connected to a database.');
    }
    return send(this, {
      url: `database/${name}`,
      method: 'GET'
    })
    .return(true)
    .catch(() => {
      return false;
    });
  }

  /**
   * Drop a database with the given name.
   *
   * @param   {String} name    The name of the database to drop.
   * @promise {Boolean}        `true`.
   */
  dropDatabase (name) {
    if (this[state].database) {
      throw new Error('Cannot call `dropDatabase()` when connected to a database.');
    }
    return send(this, {
      url: `database/${name}`,
      method: 'DELETE'
    })
    .return(true);
  }

  /**
   * Freeze a database with the given name.
   *
   * @param   {String} name    The name of the database to freeze.
   * @promise {Boolean}        `true`.
   */
  freezeDatabase () {
    if (this[state].database) {
      throw new Error('Cannot call `freezeDatabase()` when connected to a database.');
    }
    return Bluebird.reject(new NotImplementedError('freezeDatabase() is not supported via REST.'));
  }

  /**
   * Release a database with the given name.
   *
   * @param   {String} name    The name of the database to release.
   * @promise {Boolean}        `true`.
   */
  releaseDatabase () {
    if (this[state].database) {
      throw new Error('Cannot call `releaseDatabase()` when connected to a database.');
    }
    return Bluebird.reject(new NotImplementedError('releaseDatabase() is not supported via REST.'));
  }

  /**
   * Get the size of the current database.
   * @promise {Number} The total number of bytes for the database.
   */
  databaseSize () {
    if (!this[state].database) {
      throw new Error('Cannot call `databaseSize()` without being connected to a database.');
    }
    return send(this, {
      url: `allocation/${this[state].database}`,
      method: 'GET'
    })
    .get('size');
  }

  /**
   * Get the total number of records in the current database.
   * @promise {Number} The total number of records.
   */
  countRecords () {
    if (!this[state].database) {
      throw new Error('Cannot call `countRecords()` without being connected to a database.');
    }
    return Bluebird.reject(new NotImplementedError('countRecords() is not supported via REST.'));
  }

  /**
   * Reload the metadata for the current database.
   * @promise {Object} the database metadata.
   */
  reloadDatabase () {
    if (!this[state].database) {
      throw new Error('Cannot call `reloadDatabase()` without being connected to a database.');
    }
    return send(this, {
      url: `database/${this[state].database}`,
      method: 'GET'
    });
  }

  /**
   * Execute a command against the database.
   * @param   {Object} options The options for the command.
   * @promise {Object}         The command result.
   */
  command (options) {
    if (!this[state].database) {
      throw new Error('Cannot call `command()` without being connected to a database.');
    }
    let normalized = {
      class: options.class || 'q',
      language: options.language || 'sql',
      query: encodeURIComponent(options.query + (options.fetchPlan ? ' FETCHPLAN ' + options.fetchPlan : '')),
      limit: options.limit || -1,
      params: options.params
    };
    let url = `command/${this[state].database}/${normalized.language}`;
    url += `/${normalized.query}/${normalized.limit}`;
    return send(this, {
      url: url,
      method: 'POST'
    });
  }

  /**
   * Close the connection(s) to the server or database.
   * @return {this} The transport with connections closed.
   */
  close () {
    return this;
  }
}

export default RESTTransport;

/**
 * Add an alias to maintain compatibility with OrientDB URLs, which
 * use `remote` as a scheme for the binary protocol.
 * @type {Array}
 */
RESTTransport.aliases = ['remote'];

function send (transport, config = {}) {
  return makeRequest({
    url: transport.baseURL + config.url,
    method: config.method || 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: config.body ? transport.serialize(config.body) : undefined,
    auth: {
      username: transport.username,
      password: transport.password
    }
  })
  .spread((response, json) => {
    if (response.statusCode > 399) {
      return Bluebird.reject(new RequestError(json));
    }
    else {
      return json ? transport.deserialize(json) : true;
    }
  });
}
