const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING
  },
  oauth_sub_id: {
    type: DataTypes.STRING,
    unique: true
  },
  oauth_provider: {
    type: DataTypes.STRING
  },
  weeklyBudget: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  dietaryPreferences: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  allergies: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  inventory: {
    type: DataTypes.JSONB,
    defaultValue: {
      pantry: {},      // { itemName: { quantity, expiryDate, dateAdded } }
      refrigerator: {},
      freezer: {}
    }
  },
  mealHistory: {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    defaultValue: []
  },
  favoriteRecipes: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: []
  },
  nutritionGoals: {
    type: DataTypes.JSONB,
    defaultValue: {
      calories: null,
      protein: null,
      carbs: null,
      fat: null
    }
  }
}, {
  tableName: 'users',
  schema: 'public',
  timestamps: false
});

User.associate = (models) => {
  User.hasMany(models.Recipe, {
    foreignKey: 'userId',
    as: 'recipes'
  });
};

module.exports = User; 