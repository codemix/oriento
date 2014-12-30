import {create as createTransport} from './transports';

const state = Symbol('state');

/**
 * # Client
 * The client is responsible for connecting to OrientDB and instantiating
 * either a `Server` or `Database` instance, depending on the supplied options.
 *
 * This class is not visible to consumers, it's for internal wiring purposes only.
 */
export default class Client {
  /**
   * Create the client instance.
   *
   * @param {Options} options The options for the client.
   */
  constructor (options) {
    Object.defineProperty(this, state, {
      value: {
        transport: createTransport(options),
        host: options.host,
        username: options.username,
        password: options.password,
        token: options.token,
        database: options.database
      }
    });
  }


  initialize () {
    if (this.database) {
      this.createDatabase();
    }
    else {
      this.createServer();
    }
  }
}


