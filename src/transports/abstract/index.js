import {EventEmitter} from 'events';
import {state} from '../symbols';

export default class AbstractTransport extends EventEmitter {
  /**
   * The hostname / IP address of the OrientDB server.
   * @type {String}
   */
  get host () {
    return this[state].host;
  }

  /**
   * The port of the OrientDB server.
   * @type {Number}
   */
  get port () {
    return this[state].port;
  }

  /**
   * The username for the server or database.
   * @type {String}
   */
  get username () {
    return this[state].username;
  }

  /**
   * The password for the server or database.
   * @type {String}
   */
  get password () {
    return this[state].password;
  }

  /**
   * Whether to use authentication tokens for the connection.
   * @type {Boolean}
   */
  get useToken () {
    return this[state].useToken;
  }

  /**
   * The name of the database to open, if any.
   * If not specified, the client will `connect` to the server.
   * If specified, the client will `open` a database with the given name.
   * @type {String}
   */
  get database () {
    return this[state].database;
  }

}