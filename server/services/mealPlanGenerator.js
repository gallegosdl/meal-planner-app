const OpenAI = require('openai');
require('dotenv').config();
const db = require('../services/database');
const { jsonrepair } = require('jsonrepair');
const { encode } = require('gpt-3-encoder');
const TogetherAiService = require('./togetherAiService');
const imageStorage = require('../utils/imageStorage');

class MealPlanGenerator {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
    this.togetherAiService = new TogetherAiService();
  }

  // Data preparation moved to separate method
  preparePreferences(preferences) {
    return {
      totalDays: 2, // Changed to 2 days
      likes: (preferences.preferences.likes || []).slice(0, 10).join(', ') || 'None', // Limit to 10 items to avoid token overflow
      dislikes: (preferences.preferences.dislikes || []).slice(0, 2).join(', ') || 'None',
      macros: preferences.preferences.macros || { protein: 30, carbs: 40, fat: 30 },
      budget: preferences.preferences.budget || 75,
      cuisinePreferences: this.getTopCuisines(preferences.preferences.cuisinePreferences || {}),
      pantryItems: preferences.pantryItems || [] // Keep pantry items separate for logging
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
    const pantryInfo = preparedData.pantryItems && preparedData.pantryItems.length > 0 
      ? `\nPANTRY ITEMS AVAILABLE: ${preparedData.pantryItems.join(', ')}` 
      : '';
      
      return `Create a TWO day meal plan with 3 meals per day. Each meal must include: name, difficulty, prep time, ingredients, instructions, and nutritional information.

Return ONLY valid JSON matching this EXACT structure:
{
  "days": [
    {
      "day": 1,
      "meals": {
        "breakfast": {
          "name": "string",
          "difficulty": "Easy",
          "prepTime": "X min prep, Y min cook",
          "ingredients": [
            {"name": "string", "amount": "string", "notes": "string"}
          ],
          "instructions": "string",
          "nutrition": {
            "protein_g": number,
            "carbs_g": number,
            "fat_g": number,
            "calories": number
          }
        },
        "lunch": { ... same structure ... },
        "dinner": { ... same structure ... }
      }
    },
    {
      "day": 2,
      "meals": {
        "breakfast": { ... },
        "lunch": { ... },
        "dinner": { ... }
      }
    }
  ]
}

Requirements:
- Cuisine focus: ${preparedData.cuisinePreferences}
- Use ingredients: ${preparedData.likes}${pantryInfo}
- Avoid: ${preparedData.dislikes}
- Target Macros: ${preparedData.macros.protein}% protein, ${preparedData.macros.carbs}% carbs, ${preparedData.macros.fat}% fat
- Budget: $${preparedData.budget} per day
- RETURN A "nutrition" OBJECT INSIDE EACH MEAL with EXACTLY these fields: "protein_g", "carbs_g", "fat_g", "calories"
- Do NOT place nutritional info at the day-level
- Do NOT rename keys or introduce synonyms
- Keep all text fields under 200 characters
- No line breaks in text fields
- Vary meals between days
- Prioritize using pantry items when possible`;
  }

  async generateMealPlan(preferences) {
    try {
      const preparedData = this.preparePreferences(preferences);
      
      // Log pantry items usage
      if (preparedData.pantryItems && preparedData.pantryItems.length > 0) {
        console.log('Generating meal plan with pantry items:', preparedData.pantryItems);
      }
      
      const prompt = this.buildPrompt(preparedData);
      const systemMessage = "You are a seasoned chef experienced in creating detailed recipes based on the user's preferences. Return ONLY valid JSON for TWO days of meals. Return MACRO NUTRITIONAL INFORMATION. Ensure variety between days.";

      // Detailed token counting
      const promptTokens = encode(prompt).length;
      const systemTokens = encode(systemMessage).length;

      console.log('Token Breakdown:', {
        systemMessage: systemTokens,
        userPrompt: promptTokens,
        total: systemTokens + promptTokens
      });

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      });

      let responseContent = completion.choices[0].message.content;
      
      // Count tokens in response
      const responseTokens = encode(responseContent).length;
      
      // Log token usage
      console.log('Token Usage:', {
        promptTokens,
        responseTokens,
        totalTokens: promptTokens + responseTokens,
        completionTokens: completion.usage?.completion_tokens,
        promptTokensFromAPI: completion.usage?.prompt_tokens,
        totalTokensFromAPI: completion.usage?.total_tokens
      });

      console.log('Token Limits:', {
        maxResponseTokens: 2048,
        actualResponseTokens: completion.usage?.completion_tokens,
        isWithinLimit: completion.usage?.completion_tokens <= 2048,
        promptTokens: completion.usage?.prompt_tokens,
        totalTokens: completion.usage?.total_tokens
      });

      try {
        const mealPlan = JSON.parse(responseContent);
        
        // Add pantry generation metadata
        const hasPantryItems = preparedData.pantryItems && preparedData.pantryItems.length > 0;
        mealPlan.generatedWithPantry = hasPantryItems;
        if (hasPantryItems) {
          mealPlan.pantryItemCount = preparedData.pantryItems.length;
        }

        // Generate images for each meal if Together API key is available
        if (process.env.TOGETHER_API_KEY) {
          console.log('Starting image generation for meal plan...');
          for (const day of mealPlan.days) {
            console.log(`Processing day ${day.day} meals for images...`);
            for (const [mealType, meal] of Object.entries(day.meals)) {
              try {
                console.log(`Generating image for ${mealType} on day ${day.day}...`);
                const imageData = await this.togetherAiService.generateRecipeImage(meal);
                
                const fileName = imageStorage.generateFileName(`meal-${day.day}-${mealType}`);
                console.log(`Saving image as ${fileName}...`);
                const imageUrl = await imageStorage.saveBase64Image(imageData, fileName);
                
                meal.image_url = imageUrl;
                console.log(`Successfully added image_url to ${mealType} on day ${day.day}`);
              } catch (error) {
                console.error(`Failed to generate image for ${mealType} on day ${day.day}:`, error);
                // Continue with other meals even if one fails
              }
            }
          }
        } else {
          console.log('Skipping image generation - TOGETHER_API_KEY not found in environment');
        }
        
        return mealPlan;
      } catch (parseError) {
        console.log('Initial parse failed, attempting repair');
        try {
          // Try to repair malformed JSON
          const repairedJson = jsonrepair(responseContent);
          console.log('Repaired JSON:', repairedJson);
          
          const mealPlan = JSON.parse(repairedJson);
          
          if (!this.validateMealPlanStructure(mealPlan, 2)) {
            console.error('Invalid structure after repair');
            const defaultPlan = this.generateDefaultMealPlan(2);
            defaultPlan.generatedWithPantry = false;
            return defaultPlan;
          }
          
          // Add pantry generation metadata
          const hasPantryItems = preparedData.pantryItems && preparedData.pantryItems.length > 0;
          mealPlan.generatedWithPantry = hasPantryItems;
          if (hasPantryItems) {
            mealPlan.pantryItemCount = preparedData.pantryItems.length;
          }
          
          return mealPlan;
        } catch (repairError) {
          console.error('JSON repair failed:', repairError);
          const defaultPlan = this.generateDefaultMealPlan(2);
          defaultPlan.generatedWithPantry = false;
          return defaultPlan;
        }
      }
    } catch (error) {
      console.error('Meal plan generation error:', error);
      const defaultPlan = this.generateDefaultMealPlan(2);
      defaultPlan.generatedWithPantry = false;
      return defaultPlan;
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
  }

  async saveRecipesToDatabase(mealPlan) {
    for (const day of mealPlan.days) {
      for (const [mealType, meal] of Object.entries(day.meals)) {
        await db.query(
          `INSERT INTO recipes (name, difficulty, prep_time, ingredients, instructions)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            meal.name,
            meal.difficulty,
            meal.prepTime,
            JSON.stringify(meal.ingredients),
            meal.instructions
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
      instructions: "Prepare ingredients. Cook protein. Add vegetables. Serve with grains."
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