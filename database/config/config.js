const config = {
  development: {
    url: 'postgres://postgres:BzfZEbT6M1rYNP7ouy0e@sprints-mohamed-fouda.cj24eucoaq0n.us-east-1.rds.amazonaws.com:5432/sprints',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    url: process.env.DATABASE_URL || 'postgres://postgres:BzfZEbT6M1rYNP7ouy0e@sprints-mohamed-fouda.cj24eucoaq0n.us-east-1.rds.amazonaws.com:5432/sprints',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};

module.exports = config;
