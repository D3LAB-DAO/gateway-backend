const mysql = require('mysql');


// Promisify the connection.query method
function queryPromise(connection, sql, args) {
  return new Promise((resolve, reject) => {
    connection.query(sql, args, (err, results, fields) => {
      if (err) {
        return reject(err);
      }
      resolve({ results, fields });
    });
  });
}

// Function to create and return a new MySQL connection
async function createConnection() {
  const connection = mysql.createConnection({
    host: "localhost", // Docker service name as the host // mariadb
    port: 32706, // Default MariaDB port // 3306
    user: 'myuser',
    password: 'mypassword',
    database: 'mydatabase'
  });

  return new Promise((resolve, reject) => {
    connection.connect(err => {
      if (err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });
}

async function closeConnection(connection) {
  try {
    connection.end();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function isConnected(connection) {
  if (connection === undefined) {
    return new Promise((resolve, reject) => {
      resolve(false);
    });
  }

  return new Promise((resolve, reject) => {
    connection.query('SELECT 1', (err) => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}


module.exports = {
  queryPromise,
  createConnection,
  closeConnection,
  isConnected,
};
