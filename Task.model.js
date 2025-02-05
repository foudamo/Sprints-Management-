const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Task extends Model {}

  Task.init({
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assignedTo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'TeamMembers',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'todo'
    },
    priority: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'medium'
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    parsedTextId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'ParsedTexts',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Task',
    tableName: 'Tasks',
    timestamps: true
  });

  return Task;
};
