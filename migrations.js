const { Sequelize, DataTypes } = require('sequelize');
const config = require('./database/config/config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig.url, {
  ...dbConfig,
  logging: console.log // Enable logging temporarily for debugging
});

async function up() {
  try {
    // Create TeamMembers table
    await sequelize.getQueryInterface().createTable('TeamMembers', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      role: {
        type: DataTypes.STRING,
        allowNull: true
      },
      variations: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      lastActive: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    console.log('Created TeamMembers table');

    // Create Tasks table
    await sequelize.getQueryInterface().createTable('Tasks', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('todo', 'in_progress', 'done'),
        defaultValue: 'todo'
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium'
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      assignedTo: {
        type: DataTypes.UUID,
        references: {
          model: 'TeamMembers',
          key: 'id'
        },
        allowNull: true
      },
      source: {
        type: DataTypes.STRING,
        allowNull: true
      },
      originalText: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      context: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    console.log('Created Tasks table');

    // Add indexes if they don't exist
    const indexExists = await sequelize.query(
      `SELECT 1 FROM pg_indexes WHERE tablename = 'Tasks' AND indexname = 'tasks_status'`
    );
    
    if (!indexExists[0].length) {
      await sequelize.getQueryInterface().addIndex('Tasks', ['status']);
      await sequelize.getQueryInterface().addIndex('Tasks', ['assignedTo']);
      await sequelize.getQueryInterface().addIndex('Tasks', ['dueDate']);
      console.log('Added indexes');
    } else {
      console.log('Indexes already exist');
    }

    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

async function down() {
  try {
    await sequelize.getQueryInterface().dropTable('Tasks');
    await sequelize.getQueryInterface().dropTable('TeamMembers');
    return true;
  } catch (error) {
    console.error('Rollback failed:', error);
    return false;
  }
}

// Run migrations
async function runMigrations() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection successful');

    console.log('Running migrations...');
    const success = await up();
    
    if (success) {
      console.log('Migrations completed successfully');
    } else {
      console.log('Migration failed, attempting rollback...');
      await down();
    }
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

module.exports = { runMigrations };
