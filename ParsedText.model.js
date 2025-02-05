const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class ParsedText extends Model {}

  ParsedText.init({
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false
    },
    rawText: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    taskDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    parsedDate: {
      type: DataTypes.DATE,
      allowNull: false
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
    modelName: 'ParsedText',
    tableName: 'ParsedTexts',
    timestamps: true
  });

  return ParsedText;
};
