const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize('postgres://postgres:BzfZEbT6M1rYNP7ouy0e@sprints-mohamed-fouda.cj24eucoaq0n.us-east-1.rds.amazonaws.com:5432/sprints', {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;
