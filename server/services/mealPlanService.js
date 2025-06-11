const OpenAI = require('openai');
const FatSecretAPI = require('./fatSecretAPI');
const { jsonrepair } = require('jsonrepair');
const { encode } = require('gpt-3-encoder');

class MealPlanService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.fatSecret = new FatSecretAPI();
  }

  async generateMealPlan(preferences) {
    try {
      const { provider = 'openai' } = preferences;
      console.log('Generating meal plan with provider:', provider);

      if (provider === 'fatsecret') {
        return await this.generateFatSecretPlan(preferences);
      } else {
        return await this.generateOpenAIPlan(preferences);
      }
    } catch (error) {
      console.error('Meal plan generation error:', error);
      return this.generateDefaultMealPlan(2);
    }
  }

  async generateOpenAIPlan(preferences) {
    try {
      const preparedData = this.preparePreferences(preferences);
      const prompt = this.buildPrompt(preparedData);
      const systemMessage = "You are a seasoned chef experienced in creating detailed recipes based on the user's preferences. Return ONLY valid JSON for TWO days of meals. Ensure variety between days.";

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      });

      let responseContent = completion.choices[0].message.content;
      
      try {
        return JSON.parse(responseContent);
      } catch (parseError) {
        console.log('Initial parse failed, attempting repair');
        try {
          const repairedJson = jsonrepair(responseContent);
          const mealPlan = JSON.parse(repairedJson);
          
          if (!this.validateMealPlanStructure(mealPlan, 2)) {
            console.error('Invalid structure after repair');
            return this.generateDefaultMealPlan(2);
          }
          
          return mealPlan;
        } catch (repairError) {
          console.error('JSON repair failed:', repairError);
          return this.generateDefaultMealPlan(2);
        }
      }
    } catch (error) {
      console.error('OpenAI plan generation error:', error);
      return this.generateDefaultMealPlan(2);
    }
  }

  async generateFatSecretPlan(preferences) {
    try {
      const preparedData = this.preparePreferences(preferences);
      const days = [];

      // Generate 2 days of meals
      for (let day = 1; day <= 2; day++) {
        const meals = {
          breakfast: await this.searchFatSecretMeal('breakfast', preparedData),
          lunch: await this.searchFatSecretMeal('lunch', preparedData),
          dinner: await this.searchFatSecretMeal('dinner', preparedData)
        };

        days.push({
          day,
          meals
        });
      }

      return { days };
    } catch (error) {
      console.error('FatSecret plan generation error:', error);
      return this.generateDefaultMealPlan(2);
    }
  }

  async searchFatSecretMeal(mealType, preferences) {
    try {
      // Search with meal type and preferences
      const searchResults = await this.fatSecret.searchRecipes({
        maxResults: 10,
        mealType,
        preferences
      });

      // Filter and select best matching recipe
      const selectedRecipe = this.selectBestMatchingRecipe(searchResults, preferences);
      
      return {
        recipe_name: selectedRecipe.name,
        recipe_description: selectedRecipe.description,
        recipe_url: selectedRecipe.url,
        recipe_nutrition: {
          calories: selectedRecipe.nutrition.calories,
          protein: selectedRecipe.nutrition.protein,
          carbohydrate: selectedRecipe.nutrition.carbs,
          fat: selectedRecipe.nutrition.fat
        }
      };
    } catch (error) {
      console.error(`Error searching ${mealType} recipe:`, error);
      return this.getDefaultMeal(`Default ${mealType}`);
    }
  }

  preparePreferences(preferences) {
    return {
      totalDays: 2,
      likes: (preferences.preferences.likes || []).slice(0, 3).join(', ') || 'None',
      dislikes: (preferences.preferences.dislikes || []).slice(0, 2).join(', ') || 'None',
      macros: preferences.preferences.macros || { protein: 30, carbs: 40, fat: 30 },
      budget: preferences.preferences.budget || 75,
      cuisinePreferences: this.getTopCuisines(preferences.preferences.cuisinePreferences || {})
    };
  }

  getTopCuisines(cuisinePrefs) {
    return Object.entries(cuisinePrefs)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([cuisine]) => cuisine)
      .join(', ') || 'any';
  }

  buildPrompt(preparedData) {
    return `Create a TWO day meal plan with 3 meals per day. Ensure recipes are detailed and include all ingredients, instructions, and nutritional information.

Return ONLY valid JSON matching this EXACT structure:
{
  "days": [
    {
      "day": 1,
      "meals": {
        "breakfast": {
          "name": "name",
          "difficulty": "Easy",
          "prepTime": "X min prep, Y min cook",
          "ingredients": [
            {"name": "item", "amount": "qty", "notes": "brief"}
          ],
          "instructions": "steps",
          "nutrition": {
            "calories": 500,
            "macros": {
              "protein": 30,
              "carbs": 40,
              "fat": 30
            }
          }
        },
        "lunch": {...},
        "dinner": {...}
      }
    },
    {
      "day": 2,
      "meals": {...}
    }
  ]
}

Requirements:
- Cuisine focus: ${preparedData.cuisinePreferences}
- Use ingredients: ${preparedData.likes}
- Avoid: ${preparedData.dislikes}
- Target: ${preparedData.macros.protein}% protein, ${preparedData.macros.carbs}% carbs, ${preparedData.macros.fat}% fat
- Budget: $${preparedData.budget} per day
- Keep all text fields under 200 characters
- No line breaks in text fields
- Vary meals between days
- Calculate accurate macro splits and calories for each meal`;
  }

  validateMealPlanStructure(mealPlan, totalDays) {
    if (!mealPlan?.days || !Array.isArray(mealPlan.days)) return false;
    if (mealPlan.days.length !== totalDays) return false;

    return mealPlan.days.every(day => {
      return day?.meals?.breakfast 
        && day?.meals?.lunch 
        && day?.meals?.dinner
        && this.validateMealStructure(day.meals.breakfast)
        && this.validateMealStructure(day.meals.lunch)
        && this.validateMealStructure(day.meals.dinner);
    });
  }

  validateMealStructure(meal) {
    return meal?.name 
      && meal?.difficulty 
      && meal?.prepTime 
      && Array.isArray(meal?.ingredients)
      && meal?.instructions;
  }

  generateDefaultMealPlan(totalDays) {
    return {
      days: Array.from({ length: totalDays }, (_, i) => ({
        day: i + 1,
        meals: {
          breakfast: this.getDefaultMeal("Healthy Breakfast"),
          lunch: this.getDefaultMeal("Balanced Lunch"),
          dinner: this.getDefaultMeal("Nutritious Dinner")
        }
      }))
    };
  }

  getDefaultMeal(name) {
    return {
      name,
      difficulty: "Medium",
      prepTime: "30 minutes",
      ingredients: [
        { name: "Protein", amount: "150g", notes: "Your choice of protein" },
        { name: "Vegetables", amount: "200g", notes: "Mixed vegetables" },
        { name: "Grains", amount: "100g", notes: "Your choice of grains" }
      ],
      instructions: "Prepare ingredients. Cook protein. Add vegetables. Serve with grains."
    };
  }

  selectBestMatchingRecipe(recipes, preferences) {
    if (!recipes || recipes.length === 0) {
      return {
        name: "Default Recipe",
        description: "A balanced meal",
        url: "#",
        nutrition: {
          calories: 500,
          protein: 30,
          carbs: 40,
          fat: 30
        }
      };
    }

    // For now, just return the first recipe
    // TODO: Implement proper recipe selection based on preferences
    return recipes[0];
  }
}

module.exports = MealPlanService; 