const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Create TeamMembers table if it doesn't exist
      const teamMembersExists = await queryInterface.showAllTables()
        .then(tables => tables.includes('TeamMembers'));
      
      if (!teamMembersExists) {
        await queryInterface.createTable('TeamMembers', {
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
      }

      // Create Tasks table if it doesn't exist
      const tasksExists = await queryInterface.showAllTables()
        .then(tables => tables.includes('Tasks'));
      
      if (!tasksExists) {
        await queryInterface.createTable('Tasks', {
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
            allowNull: true,
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
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
      }

      // Add indexes if they don't exist
      const indexes = await queryInterface.showIndex('Tasks');
      const indexNames = indexes.map(idx => idx.name);

      if (!indexNames.includes('tasks_status')) {
        await queryInterface.addIndex('Tasks', ['status'], {
          name: 'tasks_status'
        });
      }

      if (!indexNames.includes('tasks_assignedto')) {
        await queryInterface.addIndex('Tasks', ['assignedTo'], {
          name: 'tasks_assignedto'
        });
      }

      if (!indexNames.includes('tasks_duedate')) {
        await queryInterface.addIndex('Tasks', ['dueDate'], {
          name: 'tasks_duedate'
        });
      }

      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.dropTable('Tasks');
      await queryInterface.dropTable('TeamMembers');
      console.log('Tables dropped successfully');
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};
