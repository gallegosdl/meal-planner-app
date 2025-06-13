const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Recipe = sequelize.define('Recipe', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    difficulty: {
      type: DataTypes.STRING,
      allowNull: false
    },
    prep_time: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ingredients: {
      type: DataTypes.JSONB,
      allowNull: false
    }
  }, {
    tableName: 'recipes',
    schema: 'public',
    timestamps: false
  });

  Recipe.associate = (models) => {
    Recipe.belongsTo(models.UserProfile, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Recipe;
}; 