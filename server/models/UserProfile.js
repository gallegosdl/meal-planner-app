const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true
  },
  name: DataTypes.STRING,
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
});

module.exports = UserProfile; 