const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class TeamMember extends Model {}

  TeamMember.init({
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'Developer'
    },
    nicknames: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
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
    modelName: 'TeamMember',
    tableName: 'TeamMembers',
    timestamps: true
  });

  return TeamMember;
};
