import Bluebird from 'bluebird';
import {EventEmitter} from "events";
import http from 'http';
import {AuthError, RequestError} from '../../errors';
import {createJSON as createJSONFormat} from './serialization-formats';
import {parse as parseCookie} from 'cookie';

const state = Symbol('state');

export default class Connection extends EventEmitter {
  constructor (transport) {
    this[state] = {
      transport: transport,
      queue: [],
      sessionId: 123 || null,
      ready: false
    };

    let format = createJSONFormat({}); // @fixme classes!
    this.serialize = format.serialize;
    this.deserialize = format.deserialize;

    init(transport, this);
  }

  /**
   * Whether the connection is ready to accept commands.
   * @type {Boolean}
   */
  get ready () {
    return this[state].ready;
  }

  enqueue (config) {
    let item = {
      config: config,
      resolve: null,
      reject: null,
      promise: null
    };
    item.promise = new Bluebird((resolve, reject) => {
      item.resolve = resolve;
      item.reject = reject;
    });
    this[state].queue.push(item);
    return item.promise;
  }

  dequeue () {
    return this[state].queue.shift();
  }

  send (config) {
    let promise = this.enqueue(config);
    if (this.ready && this[state].queue.length === 1) {
      this.processQueue();
    }
    return promise;
  }

  processQueue () {
    let item = this.dequeue();
    if (!item) {
      return;
    }
    send(this, item.config)
    .then(result => {
      item.resolve(result);
    })
    .catch(err => {
      item.reject(err);
    })
    .then(() => {
      if (this[state].queue.length) {
        this.processQueue();
      }
    })
    .done();
  }
}


function init (transport, connection) {
  if (transport.database) {
    retryable(connection, {
      method: 'GET',
      url: 'database/' + transport.database
    })
    .then(result => {
      connection[state].ready = true;
      connection.emit('ready', result);
      if (connection[state].queue.length) {
        connection.processQueue();
      }
    })
    .done();
  }
  else {
    connection[state].ready = true;
    connection.emit('ready', null);
    if (connection[state].queue.length) {
      connection.processQueue();
    }
  }
}

function send (connection, config) {
  let transport = connection[state].transport;
  if (transport.database && connection.sessionId) {
    return retryable(connection, config);
  }
  else {
    return makeRequest(connection, config);
  }
}

function retryable (connection, config) {
  return makeRequest(connection, config)
  .catch(AuthError, () => {
    return makeRequest(connection, config, true);
  });
}

function makeRequest (connection, config, reauth = false) {
  let transport = connection[state].transport;

  let options = {
    method: config.method || 'GET',
    host: transport.host,
    port: transport.port,
    path: '/' + config.url,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };
  let dataToSend = config.body ? connection.serialize(config.body) : false;
  if (dataToSend) {
    options.headers['Content-Length'] = Buffer.byteLength(dataToSend);
  }

  if (reauth || !transport.database || !connection[state].sessionId) {
    options.headers.Authorization = 'Basic ' + new Buffer(
      transport.username + ':' + transport.password
    ).toString('base64');
  }
  else if (connection[state].sessionId) {
    options.headers.Cookie = 'OSESSIONID='+connection[state].sessionId;
  }

  return new Bluebird((resolve, reject) => {
    let req = http.request(options, (res) => {
      res.setEncoding('utf8');
      let data;
      res.on('data', chunk => {
        if (data === undefined) {
          data = chunk;
        }
        else {
          data += chunk;
        }
      });
      res.on('end', () => {
        if (res.headers['set-cookie']) {
          connection[state].sessionId = res.headers['set-cookie']
          .map(parseCookie)
          .reduce((sessionId, item) => {
            if (item.OSESSIONID) {
              return item.OSESSIONID;
            }
            else {
              return sessionId;
            }
          }, false);
        }
        if (+res.statusCode === 401) {
          reject(new AuthError(data));
        }
        else if (res.statusCode > 399) {
          reject(new RequestError(data));
        }
        else if (data) {
          resolve(connection.deserialize(data));
        }
        else {
          resolve(null);
        }
      });
    });
    req.on('error', reject);
    if (dataToSend) {
      req.write(dataToSend);
    }
    req.end();
  });
}