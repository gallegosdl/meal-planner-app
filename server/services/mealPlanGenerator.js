const OpenAI = require('openai');
require('dotenv').config();
const db = require('../services/database');

class MealPlanGenerator {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  async generateMealPlan(preferences) {
    const totalDays = Math.max(
      preferences.preferences.mealsPerWeek.breakfast || 0,
      preferences.preferences.mealsPerWeek.lunch || 0,
      preferences.preferences.mealsPerWeek.dinner || 0
    );

    console.log('Generating meal plan for days:', totalDays);
    console.log('Preferences:', JSON.stringify(preferences, null, 2));

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a Michelin-starred chef. Create detailed recipes and return them in strict JSON format."
          },
          {
            role: "user",
            content: this.buildPrompt(preferences, totalDays)
          }
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      });

      let responseContent = completion.choices[0].message.content;
      
      // Clean and validate JSON response
      try {
        // Check for and fix common JSON issues
        responseContent = responseContent
          // Ensure all strings are terminated
          .replace(/:\s*"([^"]*?)(?=\s*[,}])/g, ':"$1"')
          // Remove any trailing commas
          .replace(/,(\s*[}\]])/g, '$1')
          // Fix any malformed line breaks in strings
          .replace(/(?<!\\)\n/g, '\\n');

        console.log('Cleaned response:', responseContent);
        
        const mealPlan = JSON.parse(responseContent);
        
        if (!this.validateMealPlanStructure(mealPlan, totalDays)) {
          throw new Error('Invalid meal plan structure');
        }

        try {
          await this.saveRecipesToDatabase(mealPlan);
        } catch (dbError) {
          console.error('Database Error:', dbError);
          // Continue with meal plan even if saving fails
        }

        return mealPlan;
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Failed Content:', responseContent);
        return this.generateDefaultMealPlan(totalDays);
      }
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return this.generateDefaultMealPlan(totalDays);
    }
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
      && meal?.instructions
      && meal?.plating;
  }

  async saveRecipesToDatabase(mealPlan) {
    for (const day of mealPlan.days) {
      for (const [mealType, meal] of Object.entries(day.meals)) {
        await db.query(
          `INSERT INTO recipes (name, difficulty, prep_time, ingredients, instructions, plating)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            meal.name,
            meal.difficulty,
            meal.prepTime,
            JSON.stringify(meal.ingredients),
            meal.instructions,
            meal.plating
          ]
        );
      }
    }
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
      instructions: "Prepare ingredients. Cook protein. Add vegetables. Serve with grains.",
      plating: "Arrange on plate with garnish"
    };
  }

  buildPrompt(preferences, totalDays) {
    return `As a Michelin-starred chef, create a detailed ${totalDays}-day meal plan. Follow these JSON formatting rules strictly:

1. All string values must use escaped quotes: \\"value\\"
2. Time formats must be: "XX min prep, YY min cooking"
3. Amounts must be single strings: "1 cup" not "1", "cup"
4. Instructions must be single strings with periods
5. No trailing commas
6. No line breaks in strings

IMPORTANT: Each day MUST include breakfast, lunch, AND dinner meals. Missing meals will cause errors.

Required Meal Structure:
{
  "days": [
    {
      "day": 1,
      "meals": {
        "breakfast": {
          "name": "Creative name",
          "difficulty": "Easy"|"Medium"|"Hard",
          "prepTime": "XX min prep, YY min cooking",
          "ingredients": [
            {
              "name": "Specific ingredient",
              "amount": "Precise measurement",
              "notes": "Quality indicators"
            }
          ],
          "instructions": "Detailed steps with periods",
          "plating": "Brief plating guide"
        },
        "lunch": { /* Same structure as breakfast */ },
        "dinner": { /* Same structure as breakfast */ }
      }
    }
  ]
}

Dietary Requirements:
- Goals: ${preferences.preferences.dietGoals.join(', ')}
- Likes: ${preferences.preferences.likes.join(', ')}
- Dislikes: ${preferences.preferences.dislikes.join(', ')}
- Macros: Protein ${preferences.preferences.macros.protein}%, Carbs ${preferences.preferences.macros.carbs}%, Fat ${preferences.preferences.macros.fat}%
- Budget: $${preferences.preferences.budget}
- Cuisine Focus: ${Object.entries(preferences.preferences.cuisinePreferences)
  .map(([cuisine, value]) => `${cuisine} (${value}%)`).join(', ')}
- Available Ingredients: ${preferences.ingredients.map(item => item.name).join(', ')}

Weekly Distribution (ALL REQUIRED):
- Breakfast: ${preferences.preferences.mealsPerWeek.breakfast} days
- Lunch: ${preferences.preferences.mealsPerWeek.lunch} days
- Dinner: ${preferences.preferences.mealsPerWeek.dinner} days

Requirements:
1. Each meal must have at least 4 detailed steps
2. Each ingredient needs specific measurements
3. Plating descriptions under 100 characters
4. Include exactly ${totalDays} days
5. All meals must be restaurant-quality
6. Focus on preferred cuisines and ingredients
7. EVERY day must have breakfast, lunch, and dinner`;
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