const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecipeOptimization = sequelize.define('RecipeOptimization', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  originalRecipeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  optimizationType: {
    type: DataTypes.ENUM('PRICE', 'NUTRITION', 'INVENTORY', 'SEASONAL'),
    allowNull: false
  },
  modifications: {
    type: DataTypes.JSONB,
    defaultValue: {
      substitutions: [],      // [{ original: "item", substitute: "item", reason: "text" }]
      quantityChanges: [],    // [{ item: "name", original: 1, new: 2, reason: "text" }]
      additions: [],          // [{ item: "name", quantity: 1, reason: "text" }]
      removals: []           // [{ item: "name", reason: "text" }]
    }
  },
  optimizationResults: {
    type: DataTypes.JSONB,
    defaultValue: {
      priceDifference: 0,
      nutritionChange: {},
      sustainabilityScore: 0
    }
  },
  userRating: {
    type: DataTypes.INTEGER,
    validate: { min: 1, max: 5 }
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Instance methods
RecipeOptimization.prototype.applyToRecipe = async function(recipe) {
  const optimizedRecipe = {...recipe};
  
  // Apply substitutions
  this.modifications.substitutions.forEach(sub => {
    const index = optimizedRecipe.ingredients.findIndex(i => i.name === sub.original);
    if (index !== -1) {
      optimizedRecipe.ingredients[index].name = sub.substitute;
      optimizedRecipe.instructions += `\n(Substitution: ${sub.original} → ${sub.substitute}: ${sub.reason})`;
    }
  });

  // Apply quantity changes
  this.modifications.quantityChanges.forEach(change => {
    const ingredient = optimizedRecipe.ingredients.find(i => i.name === change.item);
    if (ingredient) {
      ingredient.amount = change.new;
      optimizedRecipe.instructions += `\n(Quantity Change: ${change.item} ${change.original} → ${change.new}: ${change.reason})`;
    }
  });

  // Add new ingredients
  this.modifications.additions.forEach(addition => {
    optimizedRecipe.ingredients.push({
      name: addition.item,
      amount: addition.quantity
    });
    optimizedRecipe.instructions += `\n(Addition: ${addition.item}: ${addition.reason})`;
  });

  // Remove ingredients
  this.modifications.removals.forEach(removal => {
    optimizedRecipe.ingredients = optimizedRecipe.ingredients.filter(i => i.name !== removal.item);
    optimizedRecipe.instructions += `\n(Removed: ${removal.item}: ${removal.reason})`;
  });

  return optimizedRecipe;
};

// Class methods
RecipeOptimization.optimizeForInventory = async function(recipe, inventory) {
  const modifications = {
    substitutions: [],
    quantityChanges: [],
    additions: [],
    removals: []
  };

  // Check each ingredient against inventory
  recipe.ingredients.forEach(ingredient => {
    const inInventory = inventory.pantry[ingredient.name] || 
                       inventory.refrigerator[ingredient.name] || 
                       inventory.freezer[ingredient.name];

    if (inInventory) {
      if (inInventory.quantity < ingredient.amount) {
        modifications.quantityChanges.push({
          item: ingredient.name,
          original: ingredient.amount,
          new: inInventory.quantity,
          reason: "Adjusted to match inventory"
        });
      }
    } else {
      // TODO: Implement substitution logic
    }
  });

  return modifications;
};

module.exports = RecipeOptimization; 