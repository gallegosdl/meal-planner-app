const OpenAI = require('openai');
require('dotenv').config();
const db = require('../services/database');
const { jsonrepair } = require('jsonrepair');
const { encode } = require('gpt-3-encoder');
const TogetherAiService = require('./togetherAiService');
const imageStorage = require('../utils/imageStorage');

class MealPlanGenerator {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.openai = null;
    this.togetherAiService = new TogetherAiService();
  }

  // Create OpenAI client only when needed
  getOpenAIClient() {
    if (!this.openai && this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey
      });
    } else if (!this.openai && !this.apiKey) {
      throw new Error('OpenAI API key is required for meal plan generation');
    }
    return this.openai;
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

  async storeMealPlanInDatabase(mealPlan, userId, title = 'Generated Meal Plan') {
    try {
      console.log('Starting meal plan storage in database...');
      console.log('User ID:', userId);
      console.log('Title:', title);
      
      // Test if tables exist
      try {
        const tableTest = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'meal_plans'
          ) as meal_plans_exists,
          EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'meal_plan_dates'
          ) as meal_plan_dates_exists,
          EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'meal_plan_meals'
          ) as meal_plan_meals_exists,
          EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'meal_plan_meal_notes'
          ) as meal_plan_meal_notes_exists
        `);
        console.log('Table existence check:', tableTest.rows[0]);

        // Test insert
        await db.query('BEGIN');
        console.log('Test transaction started');
        
        const testMealPlan = await db.query(
          `INSERT INTO meal_plans (user_id, title, start_date, end_date)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [userId, 'TEST MEAL PLAN', new Date(), new Date()]
        );
        console.log('Test meal plan created with ID:', testMealPlan.rows[0].id);
        
        const testDate = await db.query(
          `INSERT INTO meal_plan_dates (meal_plan_id, date)
           VALUES ($1, $2)
           RETURNING id`,
          [testMealPlan.rows[0].id, new Date()]
        );
        console.log('Test meal plan date created with ID:', testDate.rows[0].id);
        
        await db.query('ROLLBACK');
        console.log('Test transaction rolled back successfully');
      } catch (tableError) {
        console.error('Error during table tests:', tableError);
        if (tableError.message) console.error('Error message:', tableError.message);
        if (tableError.detail) console.error('Error detail:', tableError.detail);
        await db.query('ROLLBACK').catch(console.error);
      }
      
      // Start actual transaction
      await db.query('BEGIN');
      console.log('Main transaction started');

      // 1. Create meal plan entry
      const mealPlanResult = await db.query(
        `INSERT INTO meal_plans (user_id, title, start_date, end_date)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          userId,
          title,
          new Date(), // Start from today
          new Date(Date.now() + (mealPlan.days.length - 1) * 24 * 60 * 60 * 1000) // End date based on days
        ]
      );
      const mealPlanId = mealPlanResult.rows[0].id;
      console.log('Created meal plan with ID:', mealPlanId);

      // 2. Create entries for each day
      for (const day of mealPlan.days) {
        const date = new Date();
        date.setDate(date.getDate() + day.day - 1);
        console.log(`Processing day ${day.day} for date ${date.toISOString()}`);

        // Insert meal_plan_date
        const dateResult = await db.query(
          `INSERT INTO meal_plan_dates (meal_plan_id, date)
           VALUES ($1, $2)
           RETURNING id`,
          [mealPlanId, date]
        );
        const mealPlanDateId = dateResult.rows[0].id;
        console.log('Created meal plan date with ID:', mealPlanDateId);

        // 3. Store each meal for the day
        for (const [mealType, meal] of Object.entries(day.meals)) {
          console.log(`Processing ${mealType} meal: ${meal.name}`);
          
          // First ensure recipe exists
          // First insert/update the recipe
          const recipeResult = await db.query(
            `INSERT INTO recipes (
              name, difficulty, prep_time, instructions, image_url,
              ingredients, category, cuisine_type, cook_time, total_time,
              servings, source_url,
              calories, protein_g, carbs_g, fat_g,
              fiber_g, sugar_g, sodium_mg, cholesterol_mg,
              is_vegetarian, is_vegan, is_gluten_free, is_dairy_free,
              is_keto_friendly, is_low_carb
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
                    $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
            ON CONFLICT (name) DO UPDATE 
            SET difficulty = EXCLUDED.difficulty,
                prep_time = EXCLUDED.prep_time,
                instructions = EXCLUDED.instructions,
                image_url = EXCLUDED.image_url,
                ingredients = EXCLUDED.ingredients,
                category = EXCLUDED.category,
                cuisine_type = EXCLUDED.cuisine_type,
                cook_time = EXCLUDED.cook_time,
                total_time = EXCLUDED.total_time,
                servings = EXCLUDED.servings,
                source_url = EXCLUDED.source_url,
                calories = EXCLUDED.calories,
                protein_g = EXCLUDED.protein_g,
                carbs_g = EXCLUDED.carbs_g,
                fat_g = EXCLUDED.fat_g,
                fiber_g = EXCLUDED.fiber_g,
                sugar_g = EXCLUDED.sugar_g,
                sodium_mg = EXCLUDED.sodium_mg,
                cholesterol_mg = EXCLUDED.cholesterol_mg,
                is_vegetarian = EXCLUDED.is_vegetarian,
                is_vegan = EXCLUDED.is_vegan,
                is_gluten_free = EXCLUDED.is_gluten_free,
                is_dairy_free = EXCLUDED.is_dairy_free,
                is_keto_friendly = EXCLUDED.is_keto_friendly,
                is_low_carb = EXCLUDED.is_low_carb
            RETURNING id`,
            [
              meal.name,
              meal.difficulty,
              meal.prepTime,
              meal.instructions,
              meal.image_url,
              JSON.stringify(meal.ingredients),
              meal.category || 'Main',  // Default to Main if not specified
              meal.cuisine_type || null,
              meal.cookTime || null,
              meal.totalTime || null,
              meal.servings || null,
              meal.source_url || null,
              meal.nutrition?.calories || 0,
              meal.nutrition?.protein_g || 0,
              meal.nutrition?.carbs_g || 0,
              meal.nutrition?.fat_g || 0,
              meal.nutrition?.fiber_g || 0,
              meal.nutrition?.sugar_g || 0,
              meal.nutrition?.sodium_mg || 0,
              meal.nutrition?.cholesterol_mg || 0,
              meal.is_vegetarian || false,
              meal.is_vegan || false,
              meal.is_gluten_free || false,
              meal.is_dairy_free || false,
              meal.is_keto_friendly || false,
              meal.is_low_carb || false
            ]
          );
          const recipeId = recipeResult.rows[0].id;

          // Handle ingredients in both JSONB column and recipe_ingredients table
          if (meal.ingredients && meal.ingredients.length > 0) {
            try {
              // First delete existing ingredients for this recipe
              await db.query(
                'DELETE FROM recipe_ingredients WHERE recipe_id = $1',
                [recipeId]
              );

              // Then insert new ingredients into recipe_ingredients table
              for (const ingredient of meal.ingredients) {
                await db.query(
                  `INSERT INTO recipe_ingredients (
                    recipe_id, name, amount, unit, notes
                  )
                  VALUES ($1, $2, $3, $4, $5)`,
                  [
                    recipeId,
                    ingredient.name,
                    ingredient.amount,
                    ingredient.unit || null,
                    ingredient.notes || null
                  ]
                );
              }
            } catch (error) {
              // If recipe_ingredients table doesn't exist yet, log and continue
              // This allows for graceful degradation until migration is complete
              console.warn('Failed to store in recipe_ingredients table:', error.message);
            }
          }
          console.log('Recipe stored/updated with ID:', recipeId);

          // Insert meal plan meal
          const mealResult = await db.query(
            `INSERT INTO meal_plan_meals (
              meal_plan_date_id,
              recipe_id,
              meal_type,
              planned_macros,
              planned_image_url
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id`,
            [
              mealPlanDateId,
              recipeId,
              mealType,
              JSON.stringify({
                calories: meal.nutrition?.calories || 0,
                protein_g: meal.nutrition?.protein_g || 0,
                carbs_g: meal.nutrition?.carbs_g || 0,
                fat_g: meal.nutrition?.fat_g || 0
              }),
              meal.image_url
            ]
          );
          console.log('Created meal plan meal with ID:', mealResult.rows[0].id);
        }
      }

      // Commit transaction
      await db.query('COMMIT');
      console.log('Transaction committed successfully');
      return mealPlanId;
    } catch (error) {
      // Rollback on error
      await db.query('ROLLBACK');
      console.error('Error storing meal plan in database:', error);
      throw error;
    }
  }

  async generateMealPlan(preferences) {
    try {
      const preparedData = this.preparePreferences(preferences);
      
      // Log if userId is present
      console.log('Generating meal plan with preferences:', {
        userId: preferences.userId,
        hasPantryItems: preparedData.pantryItems?.length > 0,
        macros: preparedData.macros
      });
      
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

      const completion = await this.getOpenAIClient().chat.completions.create({
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

      let mealPlan;
      try {
        mealPlan = JSON.parse(responseContent);
        
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

        // Store in database if user ID is provided
        if (preferences.userId) {
          console.log('Attempting to store meal plan in database for user:', preferences.userId);
          try {
            const mealPlanId = await this.storeMealPlanInDatabase(mealPlan, preferences.userId);
            console.log('Successfully stored meal plan with ID:', mealPlanId);
            mealPlan.id = mealPlanId; // Add the ID to the response
          } catch (dbError) {
            console.error('Failed to store meal plan in database:', dbError);
            // Continue without storing - at least return the generated plan
          }
        } else {
          console.log('No userId provided, skipping database storage');
        }

        return mealPlan;
      } catch (parseError) {
        console.log('Initial parse failed, attempting repair');
        try {
          const repairedJson = jsonrepair(responseContent);
          console.log('Repaired JSON:', repairedJson);
          
          mealPlan = JSON.parse(repairedJson);
          
          if (!this.validateMealPlanStructure(mealPlan, 2)) {
            console.error('Invalid structure after repair');
            mealPlan = this.generateDefaultMealPlan(2);
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
          return this.generateDefaultMealPlan(2);
        }
      }
    } catch (error) {
      console.error('Meal plan generation error:', error);
      return this.generateDefaultMealPlan(2);
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

  async getMealPlansForUser(userId, startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          mp.id as meal_plan_id,
          mp.title,
          mp.start_date,
          mp.end_date,
          mpd.id as date_id,
          mpd.date,
          mpm.meal_type,
          mpm.planned_macros,
          mpm.planned_image_url,
          r.name as recipe_name,
          r.difficulty,
          r.prep_time,
          r.instructions,
          r.ingredients,
          r.image_url as recipe_image_url,
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', mpn.id,
              'rating', mpn.user_rating,
              'comment', mpn.user_comment,
              'created_at', mpn.created_at
            ))
            FROM meal_plan_meal_notes mpn
            WHERE mpn.meal_plan_meal_id = mpm.id),
            '[]'::json
          ) as notes
        FROM meal_plans mp
        JOIN meal_plan_dates mpd ON mp.id = mpd.meal_plan_id
        JOIN meal_plan_meals mpm ON mpd.id = mpm.meal_plan_date_id
        JOIN recipes r ON mpm.recipe_id = r.id
        WHERE mp.user_id = $1
      `;

      const params = [userId];
      
      if (startDate) {
        query += ` AND mpd.date >= $${params.length + 1}`;
        params.push(startDate);
      }
      
      if (endDate) {
        query += ` AND mpd.date <= $${params.length + 1}`;
        params.push(endDate);
      }
      
      query += ` ORDER BY mpd.date, CASE 
        WHEN mpm.meal_type = 'breakfast' THEN 1
        WHEN mpm.meal_type = 'lunch' THEN 2
        WHEN mpm.meal_type = 'dinner' THEN 3
        ELSE 4
      END`;

      const result = await db.query(query, params);

      // Transform the flat results into a nested structure
      const mealPlans = {};
      for (const row of result.rows) {
        if (!mealPlans[row.meal_plan_id]) {
          mealPlans[row.meal_plan_id] = {
            id: row.meal_plan_id,
            title: row.title,
            startDate: row.start_date,
            endDate: row.end_date,
            dates: {}
          };
        }

        if (!mealPlans[row.meal_plan_id].dates[row.date]) {
          mealPlans[row.meal_plan_id].dates[row.date] = {
            id: row.date_id,
            date: row.date,
            meals: {}
          };
        }

        mealPlans[row.meal_plan_id].dates[row.date].meals[row.meal_type] = {
          recipe: {
            name: row.recipe_name,
            difficulty: row.difficulty,
            prepTime: row.prep_time,
            instructions: row.instructions,
            ingredients: row.ingredients,
            imageUrl: row.recipe_image_url
          },
          plannedMacros: row.planned_macros,
          plannedImageUrl: row.planned_image_url,
          notes: row.notes
        };
      }

      return Object.values(mealPlans);
    } catch (error) {
      console.error('Error retrieving meal plans:', error);
      throw error;
    }
  }

  async addMealNote(mealPlanMealId, rating, comment) {
    try {
      const result = await db.query(
        `INSERT INTO meal_plan_meal_notes (meal_plan_meal_id, user_rating, user_comment)
         VALUES ($1, $2, $3)
         RETURNING id, user_rating, user_comment, created_at`,
        [mealPlanMealId, rating, comment]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error adding meal note:', error);
      throw error;
    }
  }
}

module.exports = MealPlanGenerator; 