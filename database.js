// Sets up a connection pool to a MariaDB database using the mysql2/promise library.
const mysql = require('mysql2/promise');
// Creating connection pool
const pool = mysql.createPool({
  host: 'mariadb', // The same as the service name in your docker-compose file
  user: 'root',
  password: 'mysecretpassword',
  database: 'chat_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
