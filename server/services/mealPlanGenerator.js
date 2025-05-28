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
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a Michelin-starred chef specializing in creative, detailed recipes. 
You MUST:
- Return ONLY valid, complete JSON
- Follow the exact structure provided
- Include all required fields
- Never truncate responses
- Never include extra fields
- Never use line breaks in strings
- Escape all quotes in strings
- Keep responses under 15000 characters`
          },
          {
            role: "user", 
            content: this.buildPrompt(preferences, totalDays)
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 3072,  // Increased buffer
        presence_penalty: 0,
        frequency_penalty: 0
      });

      // Add safety check for response length
      const responseContent = completion.choices[0].message.content;
      if (responseContent.length > 15000) {
        console.error('Response too long, may be truncated');
        return this.generateDefaultMealPlan(totalDays);
      }

      try {
        const mealPlan = JSON.parse(responseContent);
        if (!this.validateMealPlanStructure(mealPlan, totalDays)) {
          console.error('Invalid meal plan structure');
          return this.generateDefaultMealPlan(totalDays);
        }
        await this.saveRecipesToDatabase(mealPlan);
        return mealPlan;
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        return this.generateDefaultMealPlan(totalDays);
      }
    } catch (error) {
      console.error('API Error:', error);
      return this.generateDefaultMealPlan(totalDays);
    }
  }

  validateMealPlanStructure(mealPlan, totalDays) {
    // Check basic structure
    if (!mealPlan?.days || !Array.isArray(mealPlan.days)) {
      console.error('Invalid days array');
      return false;
    }
    
    // Check day count
    if (mealPlan.days.length !== totalDays) {
      console.error(`Expected ${totalDays} days, got ${mealPlan.days.length}`);
      return false;
    }

    // Check each day's structure
    return mealPlan.days.every((day, index) => {
      if (!day.day || day.day !== index + 1) {
        console.error(`Invalid day number at index ${index}`);
        return false;
      }
      if (!day.meals?.breakfast || !day.meals?.lunch || !day.meals?.dinner) {
        console.error(`Missing meal at day ${day.day}`);
        return false;
      }
      return true;
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
    return `Create a ${totalDays}-day meal plan following these requirements:

Dietary Preferences:
- Cuisine Focus: ${Object.entries(preferences.preferences.cuisinePreferences)
  .map(([cuisine, value]) => `${cuisine} (${value}%)`).join(', ')}
- Likes: ${preferences.preferences.likes.join(', ')}
- Macros: Protein ${preferences.preferences.macros.protein}%, Carbs ${preferences.preferences.macros.carbs}%, Fat ${preferences.preferences.macros.fat}%
- Budget: $${preferences.preferences.budget} per day

Return ONLY valid JSON with this structure:
{
  "days": [
    {
      "day": 1,
      "meals": {
        "breakfast": { meal_object },
        "lunch": { meal_object },
        "dinner": { meal_object }
      }
    }
  ]
}

Where meal_object is:
{
  "name": "Name of dish",
  "difficulty": "Easy"|"Medium"|"Hard",
  "prepTime": "XX min prep, YY min cooking",
  "ingredients": [{"name": "Ingredient", "amount": "Amount", "notes": "Notes"}],
  "instructions": "Detailed steps",
  "plating": "Brief plating guide"
}`;
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