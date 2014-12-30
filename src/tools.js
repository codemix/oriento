/**
 * Parse a database URL.
 *
 * @param  {String} url The URL to parse.
 * @return {Object}     The parsed URL.
 */
export function parseUrl (url) {
  var matches = /^(\w+):\/?\/?((.+?):(.*?)@)?([^:\/]+)(:(\d+))?(\/([^\/]+)?)?\/?$/.exec(url);
  if (url === null) {
    throw new Error(`Not a supported URL: ${url}`);
  }
  return {
    url: url,
    transport: matches[1],
    username: matches[3],
    password: matches[4],
    host: matches[5],
    port: matches[7] ? +matches[7] : null,
    database: matches[9]
  };
}