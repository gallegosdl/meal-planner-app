const { Model, DataTypes, Op } = require('sequelize');
const sequelize = require('../db/config');

class MealConsumption extends Model {}

MealConsumption.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  event_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Format: YYYY-MM-DD-mealtype (e.g., "2024-01-15-breakfast")'
  },
  meal_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  recipe_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Optional reference to recipe if available'
  },
  consumed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  // Summary fields
  total_ingredients: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  ingredients_reduced: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  ingredients_insufficient: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  ingredients_no_match: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  success_rate: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Percentage of ingredients successfully reduced from pantry'
  },
  
  // JSON fields for detailed tracking
  reduction_log: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of {ingredient, pantryItem, reduced, remainingQuantity, unitConversion}'
  },
  insufficient_items: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of {ingredient, pantryItem, requested, available, unit, conversionMessage}'
  },
  no_match_items: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of {ingredient, ingredientAmount}'
  },
  unit_conversion_log: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of unit conversion attempts'
  }
}, {
  sequelize,
  modelName: 'MealConsumption',
  tableName: 'meal_consumption',
  underscored: true,
  timestamps: true,
  createdAt: 'consumed_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'event_id', 'consumed_at']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['event_id']
    },
    {
      fields: ['consumed_at']
    }
  ]
});

// Class methods for analytics
MealConsumption.getConsumptionStats = async function(userId, startDate, endDate) {
  const whereClause = { user_id: userId };
  
  if (startDate || endDate) {
    whereClause.consumed_at = {};
    if (startDate) whereClause.consumed_at[Op.gte] = startDate;
    if (endDate) whereClause.consumed_at[Op.lte] = endDate;
  }
  
  const consumptions = await this.findAll({
    where: whereClause,
    order: [['consumed_at', 'DESC']]
  });
  
  const stats = {
    totalMeals: consumptions.length,
    totalIngredients: consumptions.reduce((sum, c) => sum + c.total_ingredients, 0),
    totalReduced: consumptions.reduce((sum, c) => sum + c.ingredients_reduced, 0),
    totalInsufficient: consumptions.reduce((sum, c) => sum + c.ingredients_insufficient, 0),
    totalNoMatch: consumptions.reduce((sum, c) => sum + c.ingredients_no_match, 0),
    averageSuccessRate: consumptions.length > 0 ? 
      Math.round(consumptions.reduce((sum, c) => sum + c.success_rate, 0) / consumptions.length) : 0,
    recentConsumptions: consumptions.slice(0, 10) // Last 10 meals
  };
  
  return stats;
};

MealConsumption.recordConsumption = async function(userId, eventId, mealName, consumptionResult) {
  const {
    reductionLog = [],
    insufficientItems = [],
    noMatchItems = [],
    unitConversionLog = [],
    summary = {}
  } = consumptionResult;
  
  return await this.create({
    user_id: userId,
    event_id: eventId,
    meal_name: mealName,
    total_ingredients: summary.totalIngredients || 0,
    ingredients_reduced: summary.totalReductions || 0,
    ingredients_insufficient: summary.totalInsufficientItems || 0,
    ingredients_no_match: summary.totalNoMatchItems || 0,
    success_rate: summary.successRate || 0,
    reduction_log: reductionLog,
    insufficient_items: insufficientItems,
    no_match_items: noMatchItems,
    unit_conversion_log: unitConversionLog
  });
};

module.exports = MealConsumption; 