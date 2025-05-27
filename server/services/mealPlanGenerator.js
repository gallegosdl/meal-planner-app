const OpenAI = require('openai');
require('dotenv').config();

class MealPlanGenerator {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  async generateMealPlan(preferences) {
    // Calculate total days based on meals per week - moved outside try block
    const totalDays = Math.max(
      preferences.preferences.mealsPerWeek.breakfast || 0,
      preferences.preferences.mealsPerWeek.lunch || 0,
      preferences.preferences.mealsPerWeek.dinner || 0
    );

    try {
      const prompt = `Create a gourmet ${totalDays}-day meal plan with creative, restaurant-quality dishes using these preferences:
      
Diet Goals: ${preferences.preferences.dietGoals.join(', ')}
Likes: ${preferences.preferences.likes.join(', ')}
Dislikes: ${preferences.preferences.dislikes.join(', ')}
Macro Split: Protein ${preferences.preferences.macros.protein}%, Carbs ${preferences.preferences.macros.carbs}%, Fat ${preferences.preferences.macros.fat}%
Weekly Budget: $${preferences.preferences.budget}
Cuisine Preferences: ${Object.entries(preferences.preferences.cuisinePreferences)
  .map(([cuisine, value]) => `${cuisine} (${value})`).join(', ')}
Available Ingredients: ${preferences.ingredients.map(item => item.name).join(', ')}

Meals per week:
- Breakfast: ${preferences.preferences.mealsPerWeek.breakfast} days
- Lunch: ${preferences.preferences.mealsPerWeek.lunch} days
- Dinner: ${preferences.preferences.mealsPerWeek.dinner} days

Generate a COMPLETE ${totalDays}-DAY meal plan. Include meals based on the above preferences.

For each meal:
1. Create an innovative, flavorful dish name
2. List all ingredients with precise measurements
3. Provide detailed, step-by-step cooking instructions including:
   - Preparation techniques
   - Cooking methods and times
   - Seasoning suggestions
   - Plating recommendations
4. Include flavor combinations that complement each other
5. Suggest garnishes and presentation tips
6. Add estimated cooking time and difficulty level

Format as JSON with this structure for ALL ${totalDays} DAYS:
{
  "days": [
    {
      "day": 1,
      "meals": {
        "breakfast": {
          "name": "Creative dish name",
          "difficulty": "Easy/Medium/Hard",
          "prepTime": "X minutes",
          "ingredients": [
            {"name": "ingredient", "amount": "precise amount", "notes": "optional prep notes"}
          ],
          "instructions": "Detailed, step-by-step cooking instructions",
          "plating": "Presentation suggestions"
        },
        "lunch": {...},
        "dinner": {...}
      }
    },
    {
      "day": 2,
      "meals": {...}
    },
    // Continue for all ${totalDays} days
  ]
}

Focus on creating restaurant-quality dishes while respecting dietary preferences and macro requirements. Be creative with seasonings and cooking techniques. Ensure you provide ALL ${totalDays} DAYS in the response.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a Michelin-starred chef and nutritionist. Create innovative, flavorful meal plans that are both nutritious and worthy of fine dining. Focus on creative combinations, proper techniques, and beautiful presentation while maintaining nutritional requirements."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,  // Slightly higher for more creativity
        max_tokens: 3500   // Increased to handle ${totalDays} days of detailed meals
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
      // Now totalDays is accessible here
      return {
        days: Array.from({ length: totalDays }, (_, i) => ({
          day: i + 1,
          meals: {
            breakfast: { 
              name: 'Default meal', 
              ingredients: [], 
              instructions: 'No instructions available',
              difficulty: 'Easy',
              prepTime: '0 minutes',
              plating: 'No plating suggestions'
            },
            lunch: { 
              name: 'Default meal', 
              ingredients: [], 
              instructions: 'No instructions available',
              difficulty: 'Easy',
              prepTime: '0 minutes',
              plating: 'No plating suggestions'
            },
            dinner: { 
              name: 'Default meal', 
              ingredients: [], 
              instructions: 'No instructions available',
              difficulty: 'Easy',
              prepTime: '0 minutes',
              plating: 'No plating suggestions'
            }
          }
        }))
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