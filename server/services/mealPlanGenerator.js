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
            content: "You are a Michelin-starred chef. Return ONLY valid JSON with no comments, no trailing commas, and properly escaped strings."
          },
          {
            role: "user",
            content: this.buildPrompt(preferences, totalDays)
          }
        ],
        temperature: 0.5, // Lower temperature for more consistent output
        max_tokens: 4000,
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
    const formattedIngredients = preferences.ingredients?.map(i => `- ${i.name} (${i.quantity})`).join('\n') || 'None provided';
    const cuisinePrefs = Object.entries(preferences.preferences.cuisinePreferences || {})
      .filter(([_, value]) => value > 0)
      .map(([cuisine, value]) => `- ${cuisine}: ${value}%`).join('\n') || 'None';

    const likes = (preferences.preferences.likes || []).join(', ') || 'None';
    const dislikes = (preferences.preferences.dislikes || []).join(', ') || 'None';
    const macros = preferences.preferences.macros || { protein: 30, carbs: 40, fat: 30 };
    const mealsPerWeek = preferences.preferences.mealsPerWeek || { breakfast: 5, lunch: 5, dinner: 5 };

    return `As a Michelin-starred chef, create an innovative ${totalDays}-day meal plan that combines culinary excellence with nutritional balance. Each recipe should showcase creative flavor combinations, professional techniques, and elegant plating.

Key Requirements:
1. Every dish must feature at least one signature element (e.g., a unique sauce, spice blend, or cooking technique)
2. Include contrasting textures and complementary flavors in each meal
3. Incorporate seasonal ingredients and creative garnishes
4. Balance nutrition with gourmet appeal

For each meal, provide:
- name: Creative, restaurant-worthy title
- difficulty: "Easy", "Medium", or "Hard"
- prepTime: Detailed timing (prep + cooking)
- ingredients: [
    {
      name: Specific ingredient (e.g., "Fresh Atlantic Salmon" not just "Salmon"),
      amount: Precise measurement,
      notes: Preparation notes, substitutions, or quality indicators
    }
  ]
- instructions: Detailed, professional-grade steps (minimum 6 steps)
- plating: Specific plating instructions with garnish details
- techniques: List of culinary techniques used
- pairings: Suggested accompaniments or wine pairings

Nutritional Guidelines:
- Protein: ${macros.protein}% (focus on diverse protein sources)
- Carbs: ${macros.carbs}% (emphasize complex carbohydrates)
- Fats: ${macros.fat}% (incorporate healthy fats)

Available Ingredients:
${formattedIngredients}

Cuisine Preferences (incorporate fusion elements):
${cuisinePrefs}

Dietary Preferences:
- Likes: ${likes}
- Dislikes: ${dislikes}

Meal Distribution:
- Breakfast: ${mealsPerWeek.breakfast} (include both quick and elaborate options)
- Lunch: ${mealsPerWeek.lunch} (focus on balanced, energizing meals)
- Dinner: ${mealsPerWeek.dinner} (showcase signature dishes)

Special Instructions:
1. Each dinner should include at least one "wow factor" element
2. Breakfast should balance convenience with gourmet touches
3. Lunches should be packable but impressive
4. Include creative sauce pairings and garnishes
5. Suggest texture contrasts in each dish
6. Include chef's notes for advanced techniques

Return as valid JSON with detailed, professional-grade instructions.`;
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