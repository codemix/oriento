export default class ClientError extends Error {
  constructor (message) {
    this.name = 'ClientError';
    this.message = message;
    this.httpCode = 400;
    Error.captureStackTrace(this, this.constructor);
  }
  toJSON () {
    return {
      '@type': 'orient:ClientError',
      message: this.message
    };
  }
}
