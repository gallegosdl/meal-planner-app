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

      const responseContent = completion.choices[0].message.content;
      
      // Debug response
      console.log('Raw response length:', responseContent.length);
      console.log('First 500 chars:', responseContent.substring(0, 500));
      console.log('Last 500 chars:', responseContent.substring(responseContent.length - 500));

      // Check for common JSON issues
      const issues = this.checkJSONIssues(responseContent);
      if (issues.length > 0) {
        console.error('JSON structure issues found:', issues);
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
        console.error('JSON Parse Error at position:', parseError.position);
        console.error('Context around error:', 
          responseContent.substring(Math.max(0, parseError.position - 100), 
          Math.min(responseContent.length, parseError.position + 100))
        );
        return this.generateDefaultMealPlan(totalDays);
      }
    } catch (error) {
      console.error('API Error:', error);
      return this.generateDefaultMealPlan(totalDays);
    }
  }

  validateMealPlanStructure(mealPlan, totalDays) {
    const issues = [];

    // Basic structure checks
    if (!mealPlan?.days || !Array.isArray(mealPlan.days)) {
      issues.push('Invalid days array');
      return false;
    }

    if (mealPlan.days.length !== totalDays) {
      issues.push(`Expected ${totalDays} days, got ${mealPlan.days.length}`);
      return false;
    }

    // Validate each day
    mealPlan.days.forEach((day, index) => {
      if (!day.day || day.day !== index + 1) {
        issues.push(`Day ${index + 1}: Invalid day number`);
      }

      if (!day.meals) {
        issues.push(`Day ${index + 1}: Missing meals object`);
        return;
      }

      // Check each meal
      ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
        const meal = day.meals[mealType];
        if (!meal) {
          issues.push(`Day ${index + 1}: Missing ${mealType}`);
          return;
        }

        // Validate meal structure
        if (!meal.name) issues.push(`Day ${index + 1} ${mealType}: Missing name`);
        if (!meal.difficulty) issues.push(`Day ${index + 1} ${mealType}: Missing difficulty`);
        if (!meal.prepTime) issues.push(`Day ${index + 1} ${mealType}: Missing prepTime`);
        if (!meal.instructions) issues.push(`Day ${index + 1} ${mealType}: Missing instructions`);
        if (!meal.plating) issues.push(`Day ${index + 1} ${mealType}: Missing plating`);
        
        if (!Array.isArray(meal.ingredients)) {
          issues.push(`Day ${index + 1} ${mealType}: Invalid ingredients array`);
        } else {
          meal.ingredients.forEach((ing, i) => {
            if (!ing.name) issues.push(`Day ${index + 1} ${mealType} ingredient ${i}: Missing name`);
            if (!ing.amount) issues.push(`Day ${index + 1} ${mealType} ingredient ${i}: Missing amount`);
            if (!ing.notes) issues.push(`Day ${index + 1} ${mealType} ingredient ${i}: Missing notes`);
          });
        }
      });
    });

    if (issues.length > 0) {
      console.error('Validation issues:', issues);
      return false;
    }

    return true;
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

  checkJSONIssues(content) {
    const issues = [];
    
    // Check for unescaped quotes
    const unescapedQuotes = content.match(/[^\\]"/g);
    if (unescapedQuotes) {
      issues.push('Found unescaped quotes');
    }

    // Check for unclosed braces/brackets
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push(`Mismatched braces: ${openBraces} open vs ${closeBraces} closed`);
    }

    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      issues.push(`Mismatched brackets: ${openBrackets} open vs ${closeBrackets} closed`);
    }

    // Check for truncation indicators
    if (content.endsWith('...') || content.endsWith('…')) {
      issues.push('Response appears truncated');
    }

    // Check basic structure
    if (!content.startsWith('{"days":[{')) {
      issues.push('Invalid starting structure');
    }
    if (!content.endsWith(']}')) {
      issues.push('Invalid ending structure');
    }

    return issues;
  }
}

module.exports = MealPlanGenerator; 