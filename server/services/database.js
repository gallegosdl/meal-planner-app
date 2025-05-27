const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, '../db/recipes.sqlite'));
  }

  async saveRecipe(recipe) {
    const nutritionInfo = await this.getNutritionInfo(recipe);
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO recipes (name, difficulty, prep_time, instructions, plating, calories, protein, carbs, fat) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [recipe.name, recipe.difficulty, recipe.prepTime, recipe.instructions, recipe.plating, 
         nutritionInfo.calories, nutritionInfo.protein, nutritionInfo.carbs, nutritionInfo.fat],
        function(err) {
          if (err) return reject(err);
          
          // Save ingredients
          const recipeId = this.lastID;
          const ingredientPromises = recipe.ingredients.map(ing => 
            this.saveIngredient(recipeId, ing)
          );
          
          Promise.all(ingredientPromises)
            .then(() => resolve(recipeId))
            .catch(reject);
        }
      );
    });
  }

  // Use a nutrition API to get calorie and macro information
  async getNutritionInfo(recipe) {
    // We can use APIs like Edamam or Nutritionix
    // For now return placeholder data
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };
  }

  getAllRecipes() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT r.*, 
                AVG(rr.rating) as average_rating,
                COUNT(rr.rating) as rating_count
         FROM recipes r
         LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
         GROUP BY r.id
         ORDER BY r.created_at DESC`,
        [],
        (err, recipes) => {
          if (err) return reject(err);

          // Get ingredients for each recipe
          const recipesWithIngredients = recipes.map(recipe =>
            this.getRecipeIngredients(recipe.id)
              .then(ingredients => ({
                ...recipe,
                ingredients
              }))
          );

          Promise.all(recipesWithIngredients)
            .then(resolve)
            .catch(reject);
        }
      );
    });
  }

  getRecipeIngredients(recipeId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM ingredients WHERE recipe_id = ?',
        [recipeId],
        (err, ingredients) => {
          if (err) return reject(err);
          resolve(ingredients);
        }
      );
    });
  }

  saveIngredient(recipeId, ingredient) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO ingredients (recipe_id, name, amount, notes) VALUES (?, ?, ?, ?)',
        [recipeId, ingredient.name, ingredient.amount, ingredient.notes],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  rateRecipe(recipeId, rating, comment = '') {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO recipe_ratings (recipe_id, rating, comment) VALUES (?, ?, ?)',
        [recipeId, rating, comment],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }
}

module.exports = DatabaseService; 