const Recipe = require('./Recipe');
const User = require('./UserProfile');
const sequelize = require('../config/database');

// Set up associations
User.hasMany(Recipe, {
  foreignKey: 'user_id',
  as: 'recipes'
});

Recipe.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

module.exports = {
  Recipe,
  User,
  sequelize
}; 