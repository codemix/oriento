import Bluebird from "bluebird";
import {EventEmitter} from "events";
import {connect} from "net";
import Protocol28 from './protocol28';

const state = Symbol('state');

export default class Connection extends EventEmitter {
  constructor (transport) {
    this[state] = {
      transport: transport,
      socket: null,
      commander: null,
      queue: [],
      token: null,
      sessionId: -1,
      ready: false
    };

    init(transport, this);
  }

  /**
   * Whether the connection is ready to accept commands.
   * @type {Boolean}
   */
  get ready () {
    return this[state].ready;
  }

  send (commandName, data) {
    if (!this.ready) {
      let deferred = {
        promise: null,
        resolve: null,
        reject: null
      };
      deferred.promise = new Bluebird((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
      });
      this[state].queue.push([commandName, data, deferred]);
      return deferred.promise;
    }
    let commander = this[state].commander;
    if (data.sessionId === undefined) {
      data.sessionId = this[state].sessionId;
    }
    if (data.token === undefined) {
      data.token = this[state].token;
    }
    return commander[commandName].call(commander, data);
  }
}


function init (transport, connection) {
  let socket = connect({
    host: transport.host,
    port: transport.port
  });

  connection[state].socket = socket;

  socket.once('data', buffer => {
    let version = buffer.readInt16BE(0);
    if (version < 28) {
      connection.emit('error', new Error('Unsupported Protocol Version!'));
      return;
    }
    let protocol = new Protocol28({
      classes: {} // @fixme should get this from transport or similar
    });

    let commander = protocol.createCommander(socket);

    connection[state].commander = commander;
    if (transport.database) {
      commander.DbOpen({
        username: transport.username,
        password: transport.password,
        database: transport.database,
        useToken: transport.useToken
      })
      .then(result => {
        connection[state].sessionId = result.sessionId;
        connection[state].token = result.token;
        connection[state].ready = true;
        connection.emit('ready', result);
        processQueue(connection);
      })
      .catch(error => {
        connection.emit('error', error);
      });
    }
    else {
      commander.Connect({
        username: transport.username,
        password: transport.password,
        useToken: transport.useToken
      })
      .then(result => {
        connection[state].sessionId = result.sessionId;
        connection[state].token = result.token;
        connection[state].ready = true;
        connection.emit('ready', result);
        processQueue(connection);
      })
      .catch(error => {
        console.log(error.stack);
        connection.emit('error', error);
      });
    }
  });

  socket.on('error', error => {
    connection.emit('error', error);
  });

  socket.on('close', error => {
    connection.emit('close', error);
  });
}


function processQueue (connection) {
  let queue = connection[state].queue;
  let item;
  while ((item = queue.shift())) {
    let [commandName, data, deferred] = item;
    connection.send(commandName, data)
    .then(deferred.resolve, deferred.reject);
  }
}