const axios = require('axios');
require('dotenv').config();

class FatSecretService {
  constructor() {
    this.baseURL = 'https://platform.fatsecret.com/rest/server.api';
    this.apiKey = process.env.FATSECRET_API_KEY;
    this.apiSecret = process.env.FATSECRET_API_SECRET;
  }

  async validateMealMacros(meal) {
    try {
      let totalMacros = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };

      // Validate each ingredient's macros
      for (const ingredient of meal.ingredients) {
        const foodData = await this.searchFood(ingredient.name);
        if (foodData) {
          const servingSize = this.parseServingSize(ingredient.amount);
          const macros = this.calculateMacros(foodData, servingSize);
          totalMacros = this.addMacros(totalMacros, macros);
        }
      }

      return totalMacros;
    } catch (error) {
      console.error('Error validating meal macros:', error);
      return meal.macros; // Return original estimates if validation fails
    }
  }

  async searchFood(query) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(this.baseURL, {
        params: {
          method: 'foods.search',
          search_expression: query,
          format: 'json',
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data?.foods?.food?.[0];
    } catch (error) {
      console.error('Error searching food:', error);
      return null;
    }
  }

  parseServingSize(amount) {
    // Convert common measurements to grams
    // This is a simplified version - you'll need to expand this
    const match = amount.match(/(\d+)\s*(\w+)/);
    if (!match) return 100; // Default to 100g if parsing fails

    const [_, quantity, unit] = match;
    const conversions = {
      'g': 1,
      'oz': 28.35,
      'cup': 240,
      'tbsp': 15,
      'tsp': 5
    };

    return quantity * (conversions[unit.toLowerCase()] || 1);
  }

  calculateMacros(foodData, grams) {
    // Calculate macros based on serving size
    const serving = foodData.servings.serving[0];
    const servingGrams = serving.metric_serving_amount || 100;
    const factor = grams / servingGrams;

    return {
      calories: Math.round(serving.calories * factor),
      protein: Math.round(serving.protein * factor),
      carbs: Math.round(serving.carbohydrate * factor),
      fat: Math.round(serving.fat * factor)
    };
  }

  addMacros(total, addition) {
    return {
      calories: total.calories + addition.calories,
      protein: total.protein + addition.protein,
      carbs: total.carbs + addition.carbs,
      fat: total.fat + addition.fat
    };
  }

  async getAccessToken() {
    try {
      const response = await axios.post('https://oauth.fatsecret.com/connect/token', {
        grant_type: 'client_credentials',
        scope: 'basic'
      }, {
        auth: {
          username: this.apiKey,
          password: this.apiSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  async getFoodDetails(foodId) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(this.baseURL, {
        params: {
          method: 'food.get',
          food_id: foodId,
          format: 'json',
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting food details:', error);
      throw error;
    }
  }

  async getNutritionInfo(ingredients) {
    // This method will process a list of ingredients and return nutritional data
    try {
      const nutritionData = [];
      for (const ingredient of ingredients) {
        const searchResults = await this.searchFood(ingredient.name);
        if (searchResults?.foods?.food?.length > 0) {
          const foodId = searchResults.foods.food[0].food_id;
          const details = await this.getFoodDetails(foodId);
          nutritionData.push({
            ingredient: ingredient.name,
            nutrition: details.food.servings.serving[0]
          });
        }
      }
      return nutritionData;
    } catch (error) {
      console.error('Error getting nutrition info:', error);
      throw error;
    }
  }

  async searchRecipes(params) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(this.baseURL, {
        params: {
          method: 'recipes.search',
          format: 'json',
          max_results: 50,
          recipe_type: params.mealType,
          max_calories: params.maxCalories,
          ...this.buildSearchParams(params)
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data?.recipes?.recipe || [];
    } catch (error) {
      console.error('Error searching recipes:', error);
      return [];
    }
  }

  buildSearchParams(params) {
    const searchParams = {};
    
    // Add cuisine type if specified
    if (params.cuisine) {
      searchParams.cuisine = params.cuisine;
    }

    // Add ingredient filters
    if (params.includeIngredients?.length) {
      searchParams.include_ingredients = params.includeIngredients.join(',');
    }
    if (params.excludeIngredients?.length) {
      searchParams.exclude_ingredients = params.excludeIngredients.join(',');
    }

    // Add macro targets if specified
    if (params.proteinPercentage) {
      searchParams.min_protein = Math.floor(params.maxCalories * (params.proteinPercentage / 100) / 4);
    }
    if (params.carbsPercentage) {
      searchParams.max_carbs = Math.ceil(params.maxCalories * (params.carbsPercentage / 100) / 4);
    }
    if (params.fatPercentage) {
      searchParams.max_fat = Math.ceil(params.maxCalories * (params.fatPercentage / 100) / 9);
    }

    return searchParams;
  }

  async getRecipeDetails(recipeId) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(this.baseURL, {
        params: {
          method: 'recipe.get',
          recipe_id: recipeId,
          format: 'json'
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data?.recipe;
    } catch (error) {
      console.error('Error getting recipe details:', error);
      throw error;
    }
  }

  // Recipe builder methods
  async createRecipe(recipeData) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.post(this.baseURL, {
        method: 'recipe.create',
        format: 'json',
        recipe_name: recipeData.name,
        preparation_time_min: recipeData.prepTime,
        cooking_time_min: recipeData.cookTime,
        serving_sizes: recipeData.servings,
        directions: recipeData.instructions,
        ingredients: this.formatIngredients(recipeData.ingredients)
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data?.recipe;
    } catch (error) {
      console.error('Error creating recipe:', error);
      throw error;
    }
  }

  formatIngredients(ingredients) {
    return ingredients.map(ing => ({
      food_id: ing.foodId,
      serving_id: ing.servingId,
      number_of_units: ing.amount,
      measurement_description: ing.unit
    }));
  }

  async searchFoods(query) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(this.baseURL, {
        params: {
          method: 'foods.search',
          search_expression: query,
          format: 'json',
          max_results: 50
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data?.foods?.food || [];
    } catch (error) {
      console.error('Error searching foods:', error);
      return [];
    }
  }
}

module.exports = new FatSecretService(); 