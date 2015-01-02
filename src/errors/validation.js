import ClientError from "./client";

export default class ValidationError extends ClientError {
  constructor (message, errors) {
    this.name = 'ValidationError';
    this.message = message;
    this.errors = errors;
    this.httpCode = 400;
    Error.captureStackTrace(this, this.constructor);
  }
  toJSON () {
    return {
      '@type': 'orient:ValidationError',
      message: this.message,
      errors: this.errors
    };
  }
}
