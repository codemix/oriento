// # Oriento API
// The methods below will call the server functions. User authentication for the server must first be configured in the
// orientdb-server-config.xml file. See
// [OrientDB Wiki](https://github.com/orientechnologies/orientdb/wiki/DB-Server#users).
// To manipulate the actual database and records, see the
// [document database](https://github.com/nitrog7/node-orientdb/wiki/Document-Database) api page. Additional details
// can be found on the [OrientDB wiki](https://github.com/orientechnologies/orientdb/wiki/Network-Binary-Protocol) page.

// ## Initialize the Server
// First, require the library.
var Oriento = require('oriento');

// ### Basic Configuration
// Now, we call the `Oriento` function, passing in our connection options.
var server = new Oriento({
  host: 'localhost',
  port: 2424,
  username: 'root',
  password: 'yourpassword'
});

// `server` is now an instance of `Oriento.Server`. it provides methods for creating, listing, dropping and  using
// databases.

// ### Connection Pool
//
// Configuring the client to use a connection pool.
// By default Oriento uses one socket per server, but it is also possible to use a connection pool.
// You should carefully benchmark this against the default setting for your use case,
// there are scenarios where a connection pool is actually slightly worse for performance than a single connection.

var server = new Oriento({
  host: 'localhost',
  port: 2424,
  username: 'root',
  password: 'yourpassword',
  pool: {
    max: 10 // 1 by default
  }
});

// ## Methods
// The methods are BlueBird promise objects and use the then and error methods for callbacks. Take a look at the
// [Bluebird API](https://github.com/petkaantonov/bluebird/blob/master/API.md) for more details.

server.method().then(resultMethod).error(errorMethod);

// **Example:**
server.method()
  .then(function(results) {
    console.log('Success with results.');
  })
  .error(function(error) {
    console.log('Error with message.');
  });



// ## Server

// Properties:
// - **sessionId** _(Number)_ - Unique session id automatically generated by the server.
// - **host** _(String)_ - Location of the server. Default: "localhost".
// - **port** _(Number)_ - Server port. Default: 2424.
// - **username** _(String)_ - Authentication username. Default: "admin".
// - **password** _(String)_ - Authentication password. Default: "admin".
// - **protocolVersion** _(Number)_ - Current server protocol
// - **logger** _(Object)_ - Logging utility
// - **socket** _(Object)_ - Socket server is using to connect.


// ### Connect
// Oriento connects to the OrientDB server the first time it is needed, if no connection has already been made.


// ### List
// List all the databases on the server.
//
// > Note: there is no need to call `connect()`, the
// > connection is established the first time it is needed.
server.list()
  .then(function(list) {
    console.log('Databases: ', list);
  });

// Response:
// - **list** _(Object)_ - A list of database objects.


// ### Exists
// Check whether a database exists.
server.exists(name)
  .then(function(results) {
    console.log('Database exists: ', results);
  });

// Parameters:
// - **name** _(String)_ - Database name.
//
// Response:
// - **results** _(Boolean)_ - If database exists, returns true. Otherwise false.


// ## Configuration
// The configuration file is located in orientdb-server-config.xml, under:
// > &lt;orient-server&gt;
// >   &lt;properties&gt;&lt;/properties&gt;
// > &lt;/orient-server&gt;


// ### List
// Get list of parameters set in the configuration.
server.config.list()
  .then(function(list) {
    console.log('List of the configuration properties: ' + list);
  });

// Response:
// - **list** _(Object)_ - List of parameters.
//  - **name** _(String)_ - Parameters key.
//  - **value** _(String)_ - Parameter value.


// ### Get
// Get configuration parameters
server.config.get(key)
  .then(function(value) {
    console.log('Config param, ' + key + ' = ' + value);
  });

// Parameters:
// - **key** _(String)_ - Property key.
//
// Response:
// - **value** _(String)_ - Value of property.


// ### Set
// Set a configuration parameter
server.config.set(key, value)
  .then(function(results) {
    console.log('Config param, ' + key + ' updated? ', results);
  });

// Parameters:
// - **key** _(String)_ - Property key.
// - **value** _(String)_ - Value of property.
//
// Response:
// - **results** _(Boolean)_ - If property was set successfully, return true. Otherwise false.



// ## Database

// Properties:
// - **name** _(String)_ - Database name.
// - **sessionId** _(Number)_ - The current session id.
// - **storage** _(String)_ - Type of stroage. Options: plocal, local, or memory. Default: "plocal".
// - **type** _(String)_ - Type of database. Options: document, or graph. Default: "document".
// - **username** _(String)_ - Authentication username.
// - **password** _(String)_ - Authentication password.
// - **dataSegments** _(Array)_ - A list of data segments.
// - **transactionId** _(Number)_ - Transaction id.
// - **server** _(Object)_ - Server object.
// - **cluster** _(Object)_ - Cluster object.
// - **class** _(Object)_ - Class object.
// - **record** _(Object)_ - Record object.
// - **vertex** _(Object)_ - Vertex object.
// - **edge** _(Object)_ - Edge object.
// - **index** _(Object)_ - Index object.


// ### Open
// Using an existing database
var db = server.use('mydb');
console.log('Using database: ' + db.name);

// Using an existing database with credentials
var db = server.use({
  name: 'mydb',
  username: 'admin',
  password: 'admin'
});
console.log('Using database: ' + db.name);


// ### Add
// Creating a new database in the OrientDB server instance.
server.create({
    name: 'mydb',
    type: 'graph',
    storage: 'plocal'
  })
  .then(function(db) {
    console.log('Created a database called ' + db.name);
  });

// Parameters:
// - **config** _(Object)_ - Database configuration.
//   - **name** _(String)_ - Name of the database. _Required_.
//   - **type** _(String)_ - Type of database. Options: document or graph. Default: "document".
//   - **storage** _(String)_ - Storage type. Options: plocal, local, memory. Default: "plocal".
//
// Response:
// - **Database** _(Object)_ - A database object.


// ### Delete
// Removes a database from the OrientDB Server instance..
server.delete({
  name: 'mydb',
  type: 'graph',
  storage: 'plocal'
})
  .then(function(results) {
    console.log('Delete a database: ' + db.name);
  });

// Parameters:
// - **config** _(Object)_ - Database configuration.
//   - **name** _(String)_ - Name of the database. _Required_.
//   - **type** _(String)_ - Type of database. Options: document or graph. Default: "document".
//   - **storage** _(String)_ - Storage type. Options: plocal, local, memory. Default: "plocal".
//
// Response:
// - **results** _(Boolean)_ - If database exists, returns true. Otherwise false.


// ## Classes

// ### Get
// Getting an existing class
db.class.get('MyClass')
  .then(function (MyClass) {
    console.log('Got class: ' + MyClass.name);
  });

// ### List
// Listing all the classes in the database
db.class.list()
  .then(function (classes) {
    console.log('There are ' + classes.length + ' classes in the db:', classes);
  });

// ### Add
// Creating a new class
db.class.create('MyClass')
  .then(function (MyClass) {
    console.log('Created class: ' + MyClass.name);
  });

// Creating a new class that extends another
db.class.create('MyOtherClass', 'MyClass')
  .then(function (MyOtherClass) {
    console.log('Created class: ' + MyOtherClass.name);
  });


// ### Properties

// #### List
// Listing properties in a class
MyClass.property.list()
  .then(function (properties) {
    console.log('The class has the following properties:', properties);
  });

// #### Add
// Adding a property to a class
MyClass.property.create({
  name: 'name',
    type: 'String'
  })
  .then(function () {
    console.log('Property created.')
  });

// #### Delete
// Deleting a property from a class
MyClass.property.delete('myprop')
  .then(function () {
    console.log('Property deleted.');
  });

// ### Add Record
// Creating a record for a class
MyClass.create({
    name: 'John McFakerton',
    email: 'fake@example.com'
  })
  .then(function (record) {
    console.log('Created record: ', record);
  });

// ### List Records
// Listing records in a class
MyClass.list()
  .then(function(records) {
    console.log('Found ' + records.length + ' records:', records);
  });


// ## Records

// ### Get
// Loading a record by RID.
db.record.get('#1:1')
  .then(function(record) {
    console.log('Loaded record:', record);
  });

// ### Delete
// Deleting a record
db.record.delete('#1:1')
  .then(function() {
    console.log('Record deleted');
  });

// ## Vertex

// ### Add
// Creating a new, empty vertex
db.vertex.create('V')
  .then(function(vertex) {
    console.log('created vertex', vertex);
  });

// Creating a new vertex with some properties
db.vertex.create({
    '@class': 'V',
    key: 'value',
    foo: 'bar'
  })
  .then(function(vertex) {
    console.log('created vertex', vertex);
  });

// ### Delete
// Deleting a vertex
db.vertex.delete('#12:12')
  .then(function(count) {
    console.log('deleted ' + count + ' vertices');
  });

// ## Edges

// ### Add
// Creating a simple edge between vertices
db.edge.from('#12:12')
  .to('#12:13')
  .create('E')
  .then(function(edge) {
    console.log('created edge:', edge);
  });

// Creating an edge with properties
db.edge.from('#12:12')
  .to('#12:13')
  .create({
    '@class': 'E',
    key: 'value',
    foo: 'bar'
  })
  .then(function (edge) {
    console.log('created edge:', edge);
  });

// ### Delete
// Deleting an edge between vertices
db.edge.from('#12:12')
  .to('#12:13')
  .delete()
  .then(function(count) {
    console.log('deleted ' + count + ' edges');
  });

// ## Query Builder

// ### Select
db.select()
  .from('OUser')
  .where({status: 'ACTIVE'})
  .all()
  .then(function (users) {
    console.log('active users', users);
  });

// Select Records with Fetch Plan
db.select()
  .from('OUser')
  .where({status: 'ACTIVE'})
  .fetch({role: 5})
  .all()
  .then(function(users) {
    console.log('active users', users);
  });

// Select an expression
db.select('count(*)')
  .from('OUser')
  .where({status: 'ACTIVE'})
  .scalar()
  .then(function(total) {
    console.log('total active users', total);
  });

// Return a specific column
db.select('name')
  .from('OUser')
  .where({status: 'ACTIVE'})
  .column('name')
  .all()
  .then(function(names) {
    console.log('active user names', names.join(', '));
  });

// Transform a field
db.select('name')
  .from('OUser')
  .where({status: 'ACTIVE'})
  .transform({
    status: function(status) {
      return status.toLowerCase();
    }
  })
  .limit(1)
  .one()
  .then(function(user) {
    console.log('user status: ', user.status); // 'active'
  });

// Transform a record
db.select('name')
  .from('OUser')
  .where({status: 'ACTIVE'})
  .transform(function(record) {
    return new User(record);
  })
  .limit(1)
  .one()
  .then(function(user) {
    console.log('user is an instance of User?', (user instanceof User)); // true
  });

// Specify default values
db.select('name')
  .from('OUser')
  .where({status: 'ACTIVE'})
  .defaults({
    something: 123
  })
  .limit(1)
  .one()
  .then(function(user) {
    console.log(user.name, user.something);
  });

// ### Traverse
db.traverse()
  .from('OUser')
  .where({name: 'guest'})
  .all()
  .then(function(records) {
    console.log('found records', records);
  });

// ### Insert
db.insert()
  .into('OUser')
  .set({name: 'demo', password: 'demo', status: 'ACTIVE'})
  .one()
  .then(function(user) {
    console.log('created', user);
  });

// ### Update
db.update('OUser')
  .set({password: 'changed'})
  .where({name: 'demo'})
  .scalar()
  .then(function(total) {
    console.log('updated', total, 'users');
  });

// ### Delete
db.delete()
  .from('OUser')
  .where({name: 'demo'})
  .limit(1)
  .scalar()
  .then(function(total) {
    console.log('deleted', total, 'users');
  });