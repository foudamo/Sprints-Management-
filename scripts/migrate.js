const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const config = require('../database/config/config');
const debug = require('debug')('app:migration');
const debugError = require('debug')('app:migration:error');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig.url, dbConfig);

// Create Umzug instance for migrations
const umzug = new Umzug({
  migrations: {
    glob: 'database/migrations/*.js',
    resolve: ({ name, path, context }) => {
      debug('Loading migration:', { name, path });
      const migration = require(path);
      return {
        name,
        up: async () => {
          debug('Running migration up:', name);
          const start = Date.now();
          try {
            await migration.up(context, Sequelize);
            debug('Migration completed in', Date.now() - start, 'ms');
          } catch (error) {
            debugError('Migration failed:', error);
            throw error;
          }
        },
        down: async () => {
          debug('Running migration down:', name);
          const start = Date.now();
          try {
            await migration.down(context, Sequelize);
            debug('Rollback completed in', Date.now() - start, 'ms');
          } catch (error) {
            debugError('Rollback failed:', error);
            throw error;
          }
        },
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: {
    debug: (msg) => debug(msg),
    info: (msg) => debug(msg),
    warn: (msg) => debugError(msg),
    error: (msg) => debugError(msg)
  },
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
