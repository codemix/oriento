/**
 * The registered data transports.
 * @type {Object}
 */
const transports = {};

/**
 * Create a transport instance, based on the given client options.
 * The options contain a string `transport` property which refers
 * to the transport name.
 *
 * @param  {Options}    options The client options.
 * @return {Transport}          The transport instance.
 */
export function create (options) {
  let Transport = transports[options.transport];
  if (!Transport) {
    throw new Error(`Invalid transport specified, options are: ${Object.keys(transports).join(', ')}.`);
  }
  return new Transport(options);
}

/**
 * Register a transport with the given name.
 *
 * @param  {String}   name      The name of the transport.
 * @param  {Function} Transport The transport constructor.
 */
export function register (name, Transport) {
  transports[name] = Transport;
  if (Transport.aliases) {
    Transport.aliases.forEach((alias) => {
      transports[alias] = Transport;
    });
  }
}