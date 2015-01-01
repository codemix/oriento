import AbstractTransport from '../abstract';
import {NotImplementedError} from '../../errors';
import Bluebird from 'bluebird';
import Connection from './connection';

import {state} from '../symbols';

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
      connection: options.connection,
      token: options.token || null
    };
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
    .then(response => response.databases);
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
   * Execute a query against the database.
   * @param   {Object} options The options for the query.
   * @promise {Object}         The query result.
   */
  query (options) {
    if (!this[state].database) {
      throw new Error('Cannot call `query()` without being connected to a database.');
    }
    if (typeof options === 'string') {
      options = {
        query: options
      };
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
      method: 'GET'
    });
  }

  /**
   * Execute a command against the database.
   * @param   {Object} options The options for the command.
   * @promise {Object}         The command result.
   */
  exec (options) {
    if (!this[state].database) {
      throw new Error('Cannot call `exec()` without being connected to a database.');
    }
    if (typeof options === 'string') {
      options = {
        query: options
      };
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
   * Execute a script command.
   *
   * @param   {String} language The language to use, e.g. 'sql'.
   * @param   {String} source   The script source.
   * @param   {Object} params   The parameters for the script.
   * @promise {Object}          The script result.
   */
  script (language, source, params = {}) {
    if (!this[state].database) {
      throw new Error('Cannot call `reloadDatabase()` without being connected to a database.');
    }
    return send(this, {
      url: `batch/${this[state].database}`,
      method: 'POST',
      body: {
        transaction: true,
        operations: [
          {
            type: 'script',
            language: language,
            script: source,
            params: params
          }
        ]
      }
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
  if (!transport[state].connection) {
    transport[state].connection = new Connection(transport);
    transport[state].connection.on('ready', (status) => {
      if (status) {
        transport.emit('metadata', normalizeDatabaseInfo(status));
      }
    });
  }

  return transport[state].connection.send(config);
}


function normalizeDatabaseInfo (input) {
  return {
    clusters: input.clusters.map(normalizeCluster),
    classes: input.classes.map(normalizeClass),
    indices: input.indexes.map(normalizeIndex)
  };
}

function normalizeCluster (input) {
  return {
    '@type': 'orient:Cluster',
    id: input.id,
    name: input.name
  };
}

function normalizeClass (input) {
  return {
    '@type': 'orient:Class',
    name: input.name,
    superClass: input.superClass || null,
    alias: input.alias || null,
    abstract: input.abstract,
    strictMode: input.strictmode,
    defaultClusterId: input.defaultCluster,
    clusterIds: input.clusters,
    records: input.records,
    properties: input.properties ? input.properties.map(normalizeProperty) : []
  };
}

function normalizeProperty (input) {
  return {
    '@type': 'orient:Property',
    name: input.name,
    type: input.type,
    mandatory: input.mandatory,
    readOnly: input.readonly,
    notNull: input.notNull,
    linkedClass: input.linkedClass,
    linkedType: input.linkedType,
    collate: input.collate,
    min: input.min,
    max: input.max
  };
}

function normalizeIndex (input) {
  return {
    '@type': 'orient:Index',
    name: input.name,
    type: input.configuration.type,
    className: input.configuration.indexDefinition.className,
    propertyName: input.configuration.indexDefinition.field
  };
}