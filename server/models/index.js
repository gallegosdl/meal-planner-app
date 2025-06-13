const { Sequelize } = require('sequelize');
const Recipe = require('./Recipe');
const User = require('./UserProfile');

// Create Sequelize instance with existing database URL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  schema: 'public'
});

// Initialize models
const models = {
  Recipe: Recipe(sequelize),
  User: User(sequelize)
};

// Set up associations
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

// Export models and sequelize instance
module.exports = {
  ...models,
  sequelize
}; 