export default class NotImplementedError extends Error {
  constructor (message) {
    this.name = 'NotImplementedError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
  }
  toJSON () {
    return {
      '@type': 'orient:NotImplementedError',
      message: this.message
    };
  }
}
