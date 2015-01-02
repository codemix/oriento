export default class RequestError extends Error {
  constructor (message) {
    this.name = 'RequestError';
    this.message = message;
    this.httpCode = 400;
    Error.captureStackTrace(this, this.constructor);
  }
  toJSON () {
    return {
      '@type': 'orient:RequestError',
      message: this.message
    };
  }
}
