const { Sequelize } = require('sequelize');

// Create Sequelize instance
const sequelize = new Sequelize('sprints', 'postgres', 'BzfZEbT6M1rYNP7ouy0e', {
  host: 'sprints-mohamed-fouda.cj24eucoaq0n.us-east-1.rds.amazonaws.com',
  port: 5432,
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 20000
  },
  retry: {
    max: 3,
    timeout: 60000
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    connectTimeout: 60000,
    keepAlive: true
  }
});

// Test the connection with retries
async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('Database connection has been established successfully.');
      return true;
    } catch (error) {
      console.error(`Connection attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        console.log('Retrying connection in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  console.error('All connection attempts failed');
  return false;
}

// Initialize models
const initModels = () => {
  const TeamMember = require('./TeamMember.model')(sequelize);
  const Task = require('./Task.model')(sequelize);
  const ParsedText = require('./ParsedText.model')(sequelize);

  // Define associations
  Task.belongsTo(TeamMember, {
    foreignKey: 'assignedTo',
    as: 'assignedMember'
  });

  TeamMember.hasMany(Task, {
    foreignKey: 'assignedTo',
    as: 'assignedTasks'
  });

  Task.belongsTo(ParsedText, {
    foreignKey: 'parsedTextId',
    as: 'parsedText'
  });

  ParsedText.hasMany(Task, {
    foreignKey: 'parsedTextId',
    as: 'tasks'
  });

  return {
    TeamMember,
    Task,
    ParsedText,
    sequelize
  };
};

module.exports = {
  sequelize,
  testConnection,
  initModels
};
