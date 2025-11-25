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
    type: DataTypes.UUID,
    allowNull: false
    // Note: Database column is UUID, but sessions.user_id is INTEGER
    // The authenticateToken middleware now queries users table to get UUID
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