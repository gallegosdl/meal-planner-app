const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

class MealPlanGenerator {
  constructor(apiKey) {
    const configuration = new Configuration({
      apiKey: apiKey
    });
    this.openai = new OpenAIApi(configuration);
  }

  cleanJsonString(str) {
    try {
      // First remove any markdown formatting
      let cleaned = str
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Try direct parse first
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.day && parsed.meals) {
          return JSON.stringify(parsed);
        }
      } catch (e) {
        console.log('First parse attempt failed, cleaning JSON...');
      }

      // More aggressive cleaning only if needed
      cleaned = cleaned
        .replace(/\*+/g, '')
        .replace(/\s+/g, ' ')
        // Ensure proper quotes around property names
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        // Ensure proper quotes around string values
        .replace(/:\s*([^"{}\[\],\s][^,}\]]*[^"{}\[\],\s]?)([,}\]])/g, ':"$1"$2')
        .trim();

      // Final parse attempt
      try {
        const parsed = JSON.parse(cleaned);
        if (!parsed.day || !parsed.meals) {
          throw new Error('Invalid meal plan structure');
        }
        return JSON.stringify(parsed);
      } catch (parseError) {
        console.error('Parse error after cleaning:', parseError);
        throw new Error('Failed to parse JSON after cleaning');
      }
    } catch (error) {
      console.error('JSON cleaning error:', error);
      throw new Error('Failed to clean JSON response');
    }
  }

  validateMeal(meal) {
    if (!meal || typeof meal !== 'object') {
      return {
        name: "Default meal",
        ingredients: [],
        instructions: "No instructions available"
      };
    }

    // Ensure ingredients are in the correct format
    const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.map(ing => ({
      name: ing.item || ing.name || "Unknown ingredient",
      amount: ing.amount || "Amount not specified",
      cost: ing.estimated_cost || null
    })) : [];

    return {
      name: meal.name || "Unnamed meal",
      ingredients: ingredients,
      instructions: meal.instructions || "No instructions available"
    };
  }

  async generateMealPlan(preferences) {
    try {
      // Construct the prompt using user preferences
      const prompt = `Generate a meal plan with the following preferences:
      
Diet Goals: ${preferences.preferences.dietGoals.join(', ')}
Likes: ${preferences.preferences.likes.join(', ')}
Dislikes: ${preferences.preferences.dislikes.join(', ')}
Macro Split: Protein ${preferences.preferences.macros.protein}%, Carbs ${preferences.preferences.macros.carbs}%, Fat ${preferences.preferences.macros.fat}%
Weekly Budget: $${preferences.preferences.budget}
Cuisine Preferences: ${Object.entries(preferences.preferences.cuisinePreferences)
  .map(([cuisine, value]) => `${cuisine} (${value})`).join(', ')}
Available Ingredients: ${preferences.ingredients.map(item => item.name).join(', ')}

For each meal, provide:
1. Name
2. Ingredients with amounts
3. Brief cooking instructions

Format as JSON with this structure:
{
  "days": [
    {
      "day": 1,
      "meals": {
        "breakfast": { "name": "", "ingredients": [{"name": "", "amount": ""}], "instructions": "" },
        "lunch": { "name": "", "ingredients": [{"name": "", "amount": ""}], "instructions": "" },
        "dinner": { "name": "", "ingredients": [{"name": "", "amount": ""}], "instructions": "" }
      }
    }
  ]
}`;

      const completion = await this.openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional meal planner, gourmet chef, and nutritionist. Generate detailed meal plans that match the user's preferences and dietary requirements."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      // Parse and validate the response
      const mealPlan = JSON.parse(completion.data.choices[0].message.content);
      
      // Ensure proper structure
      if (!mealPlan.days || !Array.isArray(mealPlan.days)) {
        throw new Error('Invalid meal plan structure');
      }

      return mealPlan;

    } catch (error) {
      console.error('Error generating meal plan:', error);
      // Return a default structure if generation fails
      return {
        days: [
          {
            day: 1,
            meals: {
              breakfast: { name: 'Default meal', ingredients: [], instructions: 'No instructions available' },
              lunch: { name: 'Default meal', ingredients: [], instructions: 'No instructions available' },
              dinner: { name: 'Default meal', ingredients: [], instructions: 'No instructions available' }
            }
          },
          {
            day: 2,
            meals: {
              breakfast: { name: 'Default meal', ingredients: [], instructions: 'No instructions available' },
              lunch: { name: 'Default meal', ingredients: [], instructions: 'No instructions available' },
              dinner: { name: 'Default meal', ingredients: [], instructions: 'No instructions available' }
            }
          }
        ]
      };
    }
  }

  // Helper method for default days
  getDefaultDay(dayNum) {
    return {
      day: dayNum,
      meals: {
        breakfast: this.validateMeal(),
        lunch: this.validateMeal(),
        dinner: this.validateMeal()
      }
    };
  }

  // Add meal structure validation
  validateDayPlan(dayPlan, dayNum) {
    const defaultMeal = {
      name: "Default meal",
      ingredients: [],
      instructions: "No instructions available"
    };

    if (!dayPlan || typeof dayPlan !== 'object') {
      return {
        day: dayNum,
        meals: {
          breakfast: defaultMeal,
          lunch: defaultMeal,
          dinner: defaultMeal
        }
      };
    }

    const meals = dayPlan.meals || {};
    
    return {
      day: dayNum,
      meals: {
        breakfast: this.validateMeal(meals.breakfast) || defaultMeal,
        lunch: this.validateMeal(meals.lunch) || defaultMeal,
        dinner: this.validateMeal(meals.dinner) || defaultMeal
      }
    };
  }
}

module.exports = MealPlanGenerator; 