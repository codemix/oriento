import Client from './client';
import Options from './options';
import Transports from './transports';

// @todo this should be conditional, e.g. we don't want to import
// the binary protocol in the browser build.
import BinaryTransport from './transports/binary';
import RESTTransport from './transports/rest';
Transports.register('binary', BinaryTransport);
Transports.register('rest', RESTTransport);

/**
 * # Oriento
 *
 * The main entry point to Oriento.
 *
 *
 * @param   {Object}          options The configuration for the client.
 * @promise {Database|Server}         The database or server instance, depending on the supplied URL.
 */
export default function Oriento (options = {}) {
  if (!(options instanceof Options)) {
    options = new Options(options);
  }
  let client = new Client(options);
  return client.initialize();
}