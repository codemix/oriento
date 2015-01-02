import BinaryProtocol from "binary-protocol";
import createPrimitives from "./primitives";
import createDbOperations from "./db-operations";
import createServerOperations from "./server-operations";
import {createCSV} from "../serialization-formats";

/**
 * # Binary Protocol v28
 *
 * Responsible for encoding requests and decoding responses sent to OrientDB.
 *
 * Does not deal with establishing connections etc.
 *
 * @example create a "commander" instance for the protocol
 * ```js
 * var protocol = new Protocol28({
 *   classes: {}, // a map of class names to constructors
 *   useToken: true // use tokens for authentication
 * });
 *
 * var socket = net.connect({host: 'localhost', port: 2424});
 *
 * var commander = protocol.createCommander(socket);
 * commander.readStream.expect('Negotiate'); // kick start the connection
 *
 * commander.DbOpen({
 *   session: {
 *     username: 'admin',
 *     password: 'admin'
 *   },
 *   database: {
 *     name: 'mydb'
 *   }
 * })
 * .then(function (response) {
 *   console.log(response);
 * })
 * ```
 *
 *
 */
export default class Protocol28 extends BinaryProtocol {
  constructor (options = {}) {
    super();
    let normalized = {
      serializationFormat: options.serializationFormat || this.createSerializationFormat(options.classes),
      useToken: options.useToken,
      protocol: this,
      protocolVersion: 28
    };
    this.define(createPrimitives(normalized));
    this.define(createServerOperations(normalized));
    this.define(createDbOperations(normalized));
  }

  createSerializationFormat (classes = {}) {
    return createCSV({
      classes: classes
    });
  }
}