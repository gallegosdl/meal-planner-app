const OpenAI = require('openai');
require('dotenv').config();
const db = require('../services/database');

class MealPlanGenerator {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  // Data preparation moved to separate method
  preparePreferences(preferences) {
    // Hard code to 1 day for testing
    return {
      totalDays: 1, // Fixed to 1 day
      likes: (preferences.preferences.likes || []).slice(0, 3).join(', ') || 'None', // Limit to top 3
      dislikes: (preferences.preferences.dislikes || []).slice(0, 2).join(', ') || 'None', // Limit to top 2
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
    return `Create a ONE day meal plan with 3 meals. Ensure recipes are detailed and include all ingredients and instructions.

Required Structure:
{
  "days": [{
    "day": 1,
    "meals": {
      "breakfast": { meal_object },
      "lunch": { meal_object },
      "dinner": { meal_object }
    }
  }]
}

Where meal_object is:
{
  "name": "brief name",
  "difficulty": "Easy|Medium|Hard",
  "prepTime": "X min prep, Y min cook",
  "ingredients": [{"name": "item", "amount": "qty", "notes": "brief"}],
  "instructions": "steps with periods",
  "plating": "brief guide"
}

Requirements:
- Cuisine focus: ${preparedData.cuisinePreferences}
- Use ingredients: ${preparedData.likes}
- Avoid: ${preparedData.dislikes}
- Target: ${preparedData.macros.protein}% protein
- Budget: $${preparedData.budget}
- Max 5 ingredients per recipe
- Brief instructions`;
  }

  async generateMealPlan(preferences) {
    try {
      // Always use 1 day for testing
      const preparedData = this.preparePreferences(preferences);
      const prompt = this.buildPrompt(preparedData);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "You are a seasoned chef experienced in creating detailed recipes based on the user's preferences. Return ONLY valid JSON for ONE day of meals."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1024, // Reduced tokens since we only need 1 day
        response_format: { type: "json_object" }
      });

      const mealPlan = JSON.parse(completion.choices[0].message.content);

      if (!this.validateMealPlanStructure(mealPlan, 1)) { // Always validate for 1 day
        return this.generateDefaultMealPlan(1);
      }

      try {
        await this.saveRecipesToDatabase(mealPlan);
      } catch (dbError) {
        console.error('Database Error:', dbError);
      }

      return mealPlan;

    } catch (error) {
      console.error('Meal plan generation error:', error);
      return this.generateDefaultMealPlan(1); // Default to 1 day
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