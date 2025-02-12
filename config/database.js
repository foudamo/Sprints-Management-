const { Sequelize } = require('sequelize');
require('dotenv').config();
const debug = require('debug')('app:database');
const debugQuery = require('debug')('app:database:query');
const debugError = require('debug')('app:database:error');

const sequelize = new Sequelize('postgres://postgres:BzfZEbT6M1rYNP7ouy0e@sprints-mohamed-fouda.cj24eucoaq0n.us-east-1.rds.amazonaws.com:5432/sprints', {
  dialect: 'postgres',
  logging: (msg) => debugQuery(msg),
  benchmark: true,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  hooks: {
    beforeConnect: (config) => {
      debug('Attempting database connection:', {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username
      });
    },
    afterConnect: (connection) => {
      debug('Database connected successfully');
      debug('Connection ID:', connection.processID);
    }
  }
});

// Add event listeners for connection issues
sequelize.addHook('beforeQuery', (options) => {
  debugQuery('Executing query:', {
    sql: options.sql,
    replacements: options.replacements,
    transaction: !!options.transaction
  });
});

sequelize.addHook('afterQuery', (options, { duration }) => {
  debugQuery('Query completed in', duration, 'ms');
});

sequelize.authenticate()
  .then(() => debug('Database connection test successful'))
  .catch(err => debugError('Database connection test failed:', err));

module.exports = sequelize;
