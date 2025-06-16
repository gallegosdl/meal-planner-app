const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db/config');

class PantryItem extends Model {}

PantryItem.init({
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
  item_name: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 0
    }
  },
  category: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isIn: [['meat', 'spices', 'grains', 'vegetables']]
    }
  },
  unit: {
    type: DataTypes.TEXT,
    defaultValue: 'unit'
  }
}, {
  sequelize,
  modelName: 'PantryItem',
  tableName: 'pantry_items',
  underscored: true,
  timestamps: true
});

module.exports = PantryItem; 