const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const config = require('../database/config/config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig.url, dbConfig);

// Create Umzug instance for migrations
const umzug = new Umzug({
  migrations: {
    glob: 'database/migrations/*.js',
    resolve: ({ name, path, context }) => {
      const migration = require(path);
      return {
        name,
        up: async () => migration.up(context, Sequelize),
        down: async () => migration.down(context, Sequelize),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

// Run migrations
(async () => {
  try {
    // Test connection first
    await sequelize.authenticate();
    console.log('Database connection successful');
    
    // Run pending migrations
    const pending = await umzug.pending();
    console.log('Pending migrations:', pending.map(m => m.name));
    
    const migrations = await umzug.up();
    console.log('Executed migrations:', migrations.map(m => m.name));
    
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
})();
