const OpenAI = require('openai');
require('dotenv').config();

class MealPlanGenerator {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
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
}

Consider dietary restrictions and preferences when creating meals. Ensure meals fit within the budget and macro requirements.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional meal planner and nutritionist. Generate detailed meal plans that match the user's preferences and dietary requirements. Always respond with properly formatted JSON."
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
      const responseContent = completion.choices[0].message.content;
      console.log('OpenAI Response:', responseContent);

      try {
        const mealPlan = JSON.parse(responseContent);
        
        // Ensure proper structure
        if (!mealPlan.days || !Array.isArray(mealPlan.days)) {
          throw new Error('Invalid meal plan structure');
        }

        return mealPlan;
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        throw new Error('Failed to parse meal plan response');
      }

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