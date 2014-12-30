import {parseUrl} from './tools';

/**
 * # Client Options
 *
 * Represents the options for the client.
 * Once the options have been set, they cannot be changed.
 */
class Options {
  /**
   * Set the options.
   * @param  {Object|String} options The client options or URL.
   */
  constructor (options) {
    if (!(this instanceof Options)) {
      return new Options(options);
    }

    if (typeof options === 'string') {
      options = parseUrl(options);
    }

    this.transport = options.transport;
    this.username = options.username;
    this.password = options.password;
    this.host = options.host;
    this.port = options.port;
    this.database = options.database;
    Object.freeze(this);
  }
}

export default Options;