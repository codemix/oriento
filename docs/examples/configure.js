// # Configuring oriento
//
// First, require the library.
var Oriento =  require('oriento');


// now, we call the `Oriento` function, passing in our connection options.
var server = Oriento({
  host: 'localhost',
  port: 2424,
  username: 'root',
  password: 'yourpassword'
});

// `server` is now an instance of `Oriento.Server`.
// it provides methods for creating, listing, dropping and
// using databases.

// Finally, list all the databases on the server.

// > Note: there is no need to call `connect()`, the
// > connection is established the first time it is needed.

server.list()
.then(function (dbs) {
  console.log('Found databases: ', dbs);
});