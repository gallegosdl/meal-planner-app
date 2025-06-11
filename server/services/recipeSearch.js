const { Recipe, UserRecipePreference } = require('../models');
const { Op } = require('sequelize');
const OpenAI = require('openai');

class RecipeSearch {
  constructor() {
    this.openai = new OpenAI(process.env.OPENAI_API_KEY);
  }

  async searchRecipes(params, userId) {
    // First search our database
    const dbResults = await this.searchDatabase(params);
    
    // If we have enough results, return them
    if (dbResults.length >= params.limit) {
      return this.enrichResults(dbResults, userId);
    }

    // If we need more recipes, use OpenAI
    const aiResults = await this.generateNewRecipes(params, dbResults.length);
    
    // Save AI-generated recipes to database
    const savedAiRecipes = await this.saveAiRecipes(aiResults);

    // Combine and return results
    return this.enrichResults([...dbResults, ...savedAiRecipes], userId);
  }

  async searchDatabase(params) {
    const {
      query,
      category,
      cuisineType,
      dietary,
      maxCalories,
      minProtein,
      limit = 10
    } = params;

    const where = {};

    // Text search
    if (query) {
      where[Op.or] = [
        { name: { [Op.like]: `%${query}%` } },
        { instructions: { [Op.like]: `%${query}%` } }
      ];
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Cuisine type filter
    if (cuisineType) {
      where.cuisine_type = cuisineType;
    }

    // Dietary restrictions
    if (dietary) {
      dietary.forEach(restriction => {
        where[`is_${restriction.toLowerCase()}`] = true;
      });
    }

    // Nutrition filters
    if (maxCalories) {
      where.calories = { [Op.lte]: maxCalories };
    }
    if (minProtein) {
      where.protein = { [Op.gte]: minProtein };
    }

    return Recipe.findAll({
      where,
      limit,
      order: [['rating', 'DESC']]
    });
  }

  async generateNewRecipes(params, existingCount) {
    const limit = params.limit - existingCount;
    if (limit <= 0) return [];

    const prompt = this.buildRecipePrompt(params, limit);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      return this.parseAiResponse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return [];
    }
  }

  buildRecipePrompt(params, limit) {
    const {
      query,
      category,
      cuisineType,
      dietary,
      maxCalories,
      minProtein
    } = params;

    return `Generate ${limit} unique recipes with the following criteria:
      ${query ? `- Should be related to: ${query}` : ''}
      ${category ? `- Category: ${category}` : ''}
      ${cuisineType ? `- Cuisine type: ${cuisineType}` : ''}
      ${dietary ? `- Dietary restrictions: ${dietary.join(', ')}` : ''}
      ${maxCalories ? `- Maximum calories per serving: ${maxCalories}` : ''}
      ${minProtein ? `- Minimum protein per serving: ${minProtein}g` : ''}

      For each recipe, provide:
      1. Name
      2. Category
      3. Cuisine type
      4. Ingredients with amounts
      5. Instructions
      6. Nutrition information per serving
      7. Preparation time
      8. Difficulty level

      Format as JSON array.`;
  }

  async parseAiResponse(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return [];
    }
  }

  async saveAiRecipes(recipes) {
    const savedRecipes = [];
    
    for (const recipe of recipes) {
      try {
        const saved = await Recipe.create(recipe);
        savedRecipes.push(saved);
      } catch (error) {
        console.error('Error saving AI recipe:', error);
      }
    }

    return savedRecipes;
  }

  async enrichResults(recipes, userId) {
    // Get user preferences for these recipes
    const preferences = await UserRecipePreference.findAll({
      where: {
        user_id: userId,
        recipe_id: recipes.map(r => r.id)
      }
    });

    // Create a map of preferences
    const prefMap = new Map(
      preferences.map(p => [p.recipe_id, p])
    );

    // Enrich each recipe with user preferences
    return recipes.map(recipe => ({
      ...recipe.toJSON(),
      userPreferences: prefMap.get(recipe.id) || {
        is_favorite: false,
        times_cooked: 0,
        last_cooked: null,
        personal_notes: null
      }
    }));
  }

  // Get user's favorite recipes
  async getFavorites(userId) {
    const favorites = await UserRecipePreference.findAll({
      where: {
        user_id: userId,
        is_favorite: true
      },
      include: [Recipe],
      order: [['last_cooked', 'DESC']]
    });

    return favorites.map(f => ({
      ...f.Recipe.toJSON(),
      userPreferences: {
        is_favorite: true,
        times_cooked: f.times_cooked,
        last_cooked: f.last_cooked,
        personal_notes: f.personal_notes
      }
    }));
  }
}

module.exports = new RecipeSearch(); 