import AbstractTransport from '../abstract';
import Connection from './connection';
import {state} from '../symbols';

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 2424;

/**
 * # Binary Transport
 */
class BinaryTransport extends AbstractTransport {
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
      index: 0,
      connections: new Array(options.maxConnections || 1)
    };
  }

  /**
   * List the databases on the server.
   * @promise {Object[]} The databases on the server.
   */
  listDatabases () {
    if (this[state].database) {
      throw new Error('Cannot call `listDatabases()` when connected to a database.');
    }
    return acquireAndSend(this, 'DbList');
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
    return acquireAndSend(this, 'DbCreate', {
      name: name,
      storage: storage
    })
    .return(name);
  }

  /**
   * See if a database exists with the given name.
   *
   * @param   {String} name    The name of the database to check.
   * @param   {String} storage The database storage type, defaults to `"plocal"`.
   * @promise {Boolean}        `true` if the database exists.
   */
  hasDatabase (name, storage = 'plocal') {
    if (this[state].database) {
      throw new Error('Cannot call `hasDatabase()` when connected to a database.');
    }
    return acquireAndSend(this, 'DbExists', {
      name: name,
      storage: storage
    });
  }

  /**
   * Drop a database with the given name.
   *
   * @param   {String} name    The name of the database to drop.
   * @param   {String} storage The database storage type, defaults to `"plocal"`.
   * @promise {Boolean}        `true`.
   */
  dropDatabase (name, storage = 'plocal') {
    if (this[state].database) {
      throw new Error('Cannot call `dropDatabase()` when connected to a database.');
    }
    return acquireAndSend(this, 'DbDrop', {
      name: name,
      storage: storage
    });
  }

  /**
   * Freeze a database with the given name.
   *
   * @param   {String} name    The name of the database to freeze.
   * @param   {String} storage The database storage type, defaults to `"plocal"`.
   * @promise {Boolean}        `true`.
   */
  freezeDatabase (name, storage = 'plocal') {
    if (this[state].database) {
      throw new Error('Cannot call `freezeDatabase()` when connected to a database.');
    }
    return acquireAndSend(this, 'DbFreeze', {
      name: name,
      storage: storage
    });
  }

  /**
   * Release a database with the given name.
   *
   * @param   {String} name    The name of the database to release.
   * @param   {String} storage The database storage type, defaults to `"plocal"`.
   * @promise {Boolean}        `true`.
   */
  releaseDatabase (name, storage = 'plocal') {
    if (this[state].database) {
      throw new Error('Cannot call `releaseDatabase()` when connected to a database.');
    }
    return acquireAndSend(this, 'DbRelease', {
      name: name,
      storage: storage
    });
  }

  /**
   * Get the size of the current database.
   * @promise {Number} The total number of bytes for the database.
   */
  databaseSize () {
    if (!this[state].database) {
      throw new Error('Cannot call `databaseSize()` without being connected to a database.');
    }
    return acquireAndSend(this, 'DbSize');
  }

  /**
   * Get the total number of records in the current database.
   * @promise {Number} The total number of records.
   */
  countRecords () {
    if (!this[state].database) {
      throw new Error('Cannot call `countRecords()` without being connected to a database.');
    }
    return acquireAndSend(this, 'DbCountRecords');
  }

  /**
   * Reload the metadata for the current database.
   * @promise {Object} the database metadata.
   */
  reloadDatabase () {
    if (!this[state].database) {
      throw new Error('Cannot call `reloadDatabase()` without being connected to a database.');
    }
    return acquireAndSend(this, 'DbReload');
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
    let normalized = {
      class: options.class || 'q',
      language: options.language || 'sql',
      query: options.query,
      limit: options.limit,
      fetchPlan: options.fetchPlan,
      params: options.params
    };
    return acquireAndSend(this, 'Command', normalized);
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
    let normalized = {
      class: options.class || 'c',
      language: options.language || 'sql',
      query: options.query,
      limit: options.limit,
      fetchPlan: options.fetchPlan,
      params: options.params
    };
    return acquireAndSend(this, 'Command', normalized);
  }

  /**
   * Close the connection(s) to the server or database.
   * @return {this} The transport with connections closed.
   */
  close () {
    let connections = this[state].connections;
    connections.forEach((connection, index) => {
      if (connection) {
        connection.removeAllListeners();
        connection.close();
      }
      connections[index] = null;
    });
    return this;
  }
}

export default BinaryTransport;

/**
 * Add an alias to maintain compatibility with OrientDB URLs, which
 * use `remote` as a scheme for the binary protocol.
 * @type {Array}
 */
BinaryTransport.aliases = ['remote'];


function acquireAndSend (transport, commandName, data = {}) {
  let index = transport[state].index++;
  if (index >= transport[state].connections.length) {
    transport[state].index = index = 0;
  }
  let connection = transport[state].connections[index];
  if (!connection) {
    connection = createConnection(transport);
    transport[state].connections[index] = connection;
  }
  let options = Object.assign({}, data);
  return connection.send(commandName, options);
}


function createConnection (transport) {
  let connection = new Connection(transport);
  connection.once('error', error => {
    let connections = transport[state].connections;
    let index = connections.indexOf(connection);
    transport[index] = null;
    console.error(error);
  });
  return connection;
}
