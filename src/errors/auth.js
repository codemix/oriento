import ClientError from "./client";

export default class AuthError extends ClientError {
  constructor (message) {
    this.name = 'AuthError';
    this.message = message;
    this.httpCode = 401;
    Error.captureStackTrace(this, this.constructor);
  }
  toJSON () {
    return {
      '@type': 'orient:AuthError',
      message: this.message
    };
  }
}
