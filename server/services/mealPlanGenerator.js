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
            content: "You are a Michelin-starred chef specializing in creative, detailed recipes. Return ONLY valid JSON."
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
      
      // Clean the response content
      try {
        // Remove any markdown code blocks if present
        responseContent = responseContent.replace(/```json\n?|\n?```/g, '');
        
        // Remove any trailing commas
        responseContent = responseContent.replace(/,(\s*[}\]])/g, '$1');
        
        // Ensure all quotes are properly escaped
        responseContent = responseContent.replace(/(?<!\\)\\(?!["\\/bfnrt])/g, '\\\\');
        
        console.log('Cleaned OpenAI response:', responseContent);
        
        const mealPlan = JSON.parse(responseContent);

        if (!this.validateMealPlanStructure(mealPlan, totalDays)) {
          console.error('Invalid meal plan structure:', mealPlan);
          return this.generateDefaultMealPlan(totalDays);
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
      console.error('Meal Plan Generation Error:', error);
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
    return `As a Michelin-starred chef, create an innovative ${totalDays}-day meal plan that combines culinary excellence with nutritional balance. Each recipe must be detailed and creative while following the exact JSON structure required.

Dietary Requirements:
- Goals: ${preferences.preferences.dietGoals.join(', ')}
- Likes: ${preferences.preferences.likes.join(', ')}
- Dislikes: ${preferences.preferences.dislikes.join(', ')}
- Macros: Protein ${preferences.preferences.macros.protein}%, Carbs ${preferences.preferences.macros.carbs}%, Fat ${preferences.preferences.macros.fat}%
- Budget: $${preferences.preferences.budget}
- Cuisine Focus: ${Object.entries(preferences.preferences.cuisinePreferences)
  .map(([cuisine, value]) => `${cuisine} (${value}%)`).join(', ')}
- Available Ingredients: ${preferences.ingredients.map(item => item.name).join(', ')}

Culinary Requirements:
1. Each dinner must feature a signature sauce or compound butter
2. Include textural elements in every dish (e.g., crispy garnish, creamy element)
3. Incorporate professional techniques (e.g., pan searing, reduction sauces)
4. Every meal should have a thoughtful garnish and plating description
5. Breakfast should range from quick (15 min) to elaborate weekend-style
6. Lunches should be packable but restaurant-quality
7. Dinners should showcase advanced techniques and plating

Return ONLY valid JSON matching this structure exactly:
{
  "days": [
    {
      "day": 1,
      "meals": {
        "breakfast": {
          "name": "Creative, descriptive name (e.g., 'Herb-Crusted Eggs Florentine with Citrus Hollandaise')",
          "difficulty": "Easy"|"Medium"|"Hard",
          "prepTime": "Detailed timing (e.g., '15 min prep, 25 min cooking')",
          "ingredients": [
            {
              "name": "Specific ingredient (e.g., 'Fresh Atlantic Salmon Fillet')",
              "amount": "Precise measurement",
              "notes": "Quality indicators, prep notes, or substitutions"
            }
          ],
          "instructions": "Detailed, numbered steps with techniques and timing",
          "plating": "Specific plating guide with garnish details"
        },
        "lunch": {same structure},
        "dinner": {same structure}
      }
    }
  ]
}

Weekly Meal Distribution:
- Breakfast: ${preferences.preferences.mealsPerWeek.breakfast} days
- Lunch: ${preferences.preferences.mealsPerWeek.lunch} days
- Dinner: ${preferences.preferences.mealsPerWeek.dinner} days

STRICT REQUIREMENTS:
1. Instructions MUST be detailed, professional steps (minimum 4 steps)
2. Each ingredient MUST have specific measurements and notes
3. Plating MUST include specific garnish and presentation details
4. NO comments or trailing commas in JSON
5. ALL strings MUST be properly escaped
6. MUST include exactly ${totalDays} days
7. Each meal MUST have all required fields
8. Each recipe name MUST be descriptive and appetizing

Focus on creating restaurant-worthy dishes while maintaining the exact JSON structure.`;
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