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
      
      return `Create a RESTAURANT-QUALITY and INVENTIVE TWO day meal plan with 3 UNIQUE meals per day. You are a world-class chef creating restaurant-quality dishes. Each meal must include: name, difficulty, prep time, ingredients, instructions, and nutritional information.

🎯 CREATIVITY MANDATE: Make each meal completely different, gourmet, and inventive. NO REPETITION between days or meals.

Return ONLY valid JSON matching this EXACT structure:
{
  "days": [
    {
      "day": 1,
      "meals": {
        "breakfast": {
          "name": "Creative Unique Breakfast Name",
          "difficulty": "Easy/Medium/Hard",
          "prepTime": "X min prep, Y min cook",
          "ingredients": [
            {"name": "ingredient name", "amount": "quantity", "notes": "preparation note"}
          ],
          "instructions": "detailed cooking instructions",
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

🍳 BREAKFAST IDEAS: Think beyond oatmeal - shakshuka, Dutch baby pancakes, Korean egg bowls, Turkish menemen, Japanese tamagoyaki, French pain perdu, Mexican huevos rancheros, Indian upma, Middle Eastern fatteh, etc.

🥗 LUNCH IDEAS: Inventive salads, grain bowls, gourmet sandwiches, Asian noodle dishes, Mediterranean wraps, fusion tacos, artisan soups, Buddha bowls, etc.

🍽️ DINNER IDEAS: Restaurant-quality mains - think seared proteins with creative sauces, stuffed vegetables, gourmet risottos, ethnic curries, braised dishes, grilled specialties, etc.

REQUIREMENTS:
- Cuisine focus: ${preparedData.cuisinePreferences}
- Preferred ingredients: ${preparedData.likes}${pantryInfo}
- Avoid: ${preparedData.dislikes}
- Target Macros: ${preparedData.macros.protein}% protein, ${preparedData.macros.carbs}% carbs, ${preparedData.macros.fat}% fat
- Budget: $${preparedData.budget} per day
- RETURN A "nutrition" OBJECT INSIDE EACH MEAL with EXACTLY these fields: "protein_g", "carbs_g", "fat_g", "calories"
- INGREDIENTS must be objects with "name", "amount", and "notes" fields
- Each meal must be COMPLETELY DIFFERENT from others
- Use creative flavor combinations and cooking techniques
- Make it restaurant-quality and gourmet
- Include interesting spices, herbs, and seasonings
- Use pantry items creatively when possible
- Vary meals dramatically between days
- NO BASIC/BORING meals - be inventive!`;
  }

  /** Builds the prompt for a SINGLE day */
  buildPromptForDay(preparedData, dayNum) {
    const pantryInfo = preparedData.pantryItems?.length
      ? `\nPANTRY ITEMS AVAILABLE: ${preparedData.pantryItems.join(', ')}`
      : '';

    // Add variety elements based on day number
    const varietyElements = [
      'Mediterranean fusion', 'Asian-inspired', 'Latin American', 'Middle Eastern', 'Indian spiced', 'French bistro style', 'Italian rustic', 'Thai-influenced', 'Mexican street food', 'Korean BBQ style', 'Moroccan tagine', 'Greek taverna', 'Japanese izakaya', 'Turkish mezze', 'Vietnamese pho house', 'Peruvian ceviche bar', 'Ethiopian spice blend', 'Lebanese mountain', 'Chinese dim sum', 'Spanish tapas'
    ];
    
    const cookingMethods = [
      'grilled', 'roasted', 'sautéed', 'braised', 'steamed', 'poached', 'seared', 'caramelized', 'charred', 'blackened', 'pan-fried', 'oven-baked', 'slow-cooked', 'pressure-cooked', 'smoked', 'cured', 'marinated', 'glazed', 'stuffed', 'wrapped'
    ];
    
    const creativeTwists = [
      'with unexpected spice combinations', 'featuring seasonal ingredients', 'with a modern twist on classics', 'incorporating fermented elements', 'with aromatic herb blends', 'featuring artisanal touches', 'with bold flavor contrasts', 'showcasing local ingredients', 'with restaurant-quality presentation', 'featuring umami-rich components'
    ];

    // Enhanced variety for dinners specifically
    const dinnerProteins = [
      'salmon', 'cod', 'chicken thighs', 'beef tenderloin', 'pork belly', 'lamb chops', 'duck breast', 'turkey breast', 'shrimp', 'scallops', 'tofu', 'tempeh', 'portobello mushrooms', 'lentils', 'chickpeas', 'quinoa', 'halibut', 'tuna', 'prawns', 'mussels'
    ];

    const dinnerStyles = [
      'curry', 'stir-fry', 'risotto', 'pasta', 'tacos', 'soup', 'salad', 'grain bowl', 'casserole', 'stew', 'stuffed vegetables', 'pizza', 'flatbread', 'noodle dish', 'rice bowl', 'buddha bowl', 'wrap', 'sandwich', 'burger', 'skewers'
    ];

    const varietyStyle = varietyElements[dayNum % varietyElements.length];
    const cookingStyle = cookingMethods[dayNum % cookingMethods.length];
    const creativeTwist = creativeTwists[dayNum % creativeTwists.length];
    const dinnerProtein = dinnerProteins[dayNum % dinnerProteins.length];
    const dinnerStyle = dinnerStyles[dayNum % dinnerStyles.length];

    return `Create a CREATIVE and INVENTIVE meal plan for **DAY ${dayNum}** with 3 UNIQUE meals. You are a world-class chef creating restaurant-quality dishes.

🎯 CREATIVITY MANDATE: Make each meal completely different, gourmet, and inventive. NO REPETITION of dishes from previous days.

🚫 ABSOLUTELY FORBIDDEN: Do NOT create any meals that are similar to previous days. Each day must be completely unique.

TODAY'S INSPIRATION: ${varietyStyle} cuisine ${creativeTwist}, featuring ${cookingStyle} techniques.

🍽️ DINNER SPECIFIC REQUIREMENT: Create a ${dinnerStyle} featuring ${dinnerProtein} that is completely different from any previous dinner. Make it creative and unique.

Return ONLY valid JSON matching this EXACT structure:
{
  "day": ${dayNum},
  "meals": {
    "breakfast": {
      "name": "Creative Unique Breakfast Name",
      "difficulty": "Easy/Medium/Hard",
      "prepTime": "X min prep, Y min cook",
      "ingredients": [
        {"name": "ingredient name", "amount": "quantity", "notes": "preparation note"}
      ],
      "instructions": "DETAILED step-by-step cooking instructions - MANDATORY FIELD",
      "nutrition": {
        "protein_g": number,
        "carbs_g": number,
        "fat_g": number,
        "calories": number
      }
    },
    "lunch": {
      "name": "Creative Unique Lunch Name",
      "difficulty": "Easy/Medium/Hard", 
      "prepTime": "X min prep, Y min cook",
      "ingredients": [
        {"name": "ingredient name", "amount": "quantity", "notes": "preparation note"}
      ],
      "instructions": "DETAILED step-by-step cooking instructions - MANDATORY FIELD",
      "nutrition": {
        "protein_g": number,
        "carbs_g": number,
        "fat_g": number,
        "calories": number
      }
    },
    "dinner": {
      "name": "Creative Unique Dinner Name",
      "difficulty": "Easy/Medium/Hard",
      "prepTime": "X min prep, Y min cook", 
      "ingredients": [
        {"name": "ingredient name", "amount": "quantity", "notes": "preparation note"}
      ],
      "instructions": "DETAILED step-by-step cooking instructions - MANDATORY FIELD",
      "nutrition": {
        "protein_g": number,
        "carbs_g": number,
        "fat_g": number,
        "calories": number
      }
    }
  }
}

🍳 BREAKFAST IDEAS: Think beyond oatmeal - shakshuka, Dutch baby pancakes, Korean egg bowls, Turkish menemen, Japanese tamagoyaki, French pain perdu, Mexican huevos rancheros, Indian upma, Middle Eastern fatteh, etc.

🥗 LUNCH IDEAS: Inventive salads, grain bowls, gourmet sandwiches, Asian noodle dishes, Mediterranean wraps, fusion tacos, artisan soups, Buddha bowls, etc.

🍽️ DINNER IDEAS: Restaurant-quality mains - think seared proteins with creative sauces, stuffed vegetables, gourmet risottos, ethnic curries, braised dishes, grilled specialties, etc.

CRITICAL REQUIREMENTS:
- Cuisine focus: ${preparedData.cuisinePreferences}
- Preferred ingredients: ${preparedData.likes}${pantryInfo}
- Avoid: ${preparedData.dislikes}
- Target Macros: ${preparedData.macros.protein}% protein, ${preparedData.macros.carbs}% carbs, ${preparedData.macros.fat}% fat
- Budget: $${preparedData.budget}
- INGREDIENTS must be objects with "name", "amount", and "notes" fields
- INSTRUCTIONS are MANDATORY - provide detailed step-by-step cooking directions
- Each meal must be COMPLETELY DIFFERENT from others
- DINNER must be unique ${dinnerStyle} with ${dinnerProtein}
- Use creative flavor combinations and cooking techniques
- Make it restaurant-quality and gourmet
- Include interesting spices, herbs, and seasonings
- Use pantry items creatively when possible
- NO BASIC/BORING meals - be inventive!
- NEVER repeat the same dish type across days`;
  }

  /**
   * NEW: Streaming generator for day-by-day meal plan creation.
   * Yields one day's plan at a time, as soon as it's ready.
   * 
   * usage: 
   * for await (const dayResult of generateMealPlanStreaming(preferences, 7)) { ... }
   */
  async *generateMealPlanStreaming(preferences, totalDays = 7) {
    console.log(`🚀 Starting streaming generation for ${totalDays} days...`);
    const preparedData = this.preparePreferences(preferences);
    const systemMessage = `You are a world-class chef creating structured JSON meal plans. Each day must be completely unique with NO repetition of meals or similar dishes across days. You have exceptional creativity and never repeat yourself. Return exactly the JSON structure requested. No extra text.`;

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      console.log(`🔄 Processing day ${dayNum} of ${totalDays}...`);
      const prompt = this.buildPromptForDay(preparedData, dayNum);

      let retries = 2;
      let dayPlan = null;

      while (retries > 0 && !dayPlan) {
        try {
          console.log(`🤖 Calling OpenAI for day ${dayNum} (attempt ${3 - retries})...`);
          const completion = await this.getOpenAIClient().chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: prompt }
            ],
            temperature: 0.9, // Higher temperature for more creativity
            max_tokens: 1024,
            response_format: { type: "json_object" }
          });

          let responseContent = completion.choices[0].message.content;
          console.log(`📝 Received response for day ${dayNum}, length: ${responseContent.length}`);

          try {
            dayPlan = JSON.parse(responseContent);
            console.log(`✅ Successfully parsed JSON for day ${dayNum}`);
          } catch (err) {
            console.warn(`⚠️ Invalid JSON from OpenAI on day ${dayNum}, attempting repair...`);
            responseContent = jsonrepair(responseContent);
            dayPlan = JSON.parse(responseContent);
            console.log(`🔧 Successfully repaired JSON for day ${dayNum}`);
          }

          // Validate and potentially fix the day plan
          if (!this.validateDayPlan(dayPlan, dayNum)) {
            console.warn(`⚠️ Day plan validation failed for day ${dayNum}, attempting to fix...`);
            console.log('Original dayPlan structure:', JSON.stringify(dayPlan, null, 2));
            
            // Try to fix the day plan
            dayPlan = this.fixDayPlan(dayPlan, dayNum);
            console.log('Fixed dayPlan structure:', JSON.stringify(dayPlan, null, 2));
            
            // Validate again after fixing
            if (!this.validateDayPlan(dayPlan, dayNum)) {
              console.error(`❌ Validation failed for day ${dayNum} even after fixing - using default plan`);
              dayPlan = this.generateDefaultDayPlan(dayNum);
            } else {
              console.log(`✅ Day plan fixed and validated successfully for day ${dayNum}`);
            }
          } else {
            console.log(`✅ Day plan validation passed for day ${dayNum}`);
          }

          console.log(`✅ Generated day ${dayNum} plan successfully`);
        } catch (err) {
          console.error(`❌ Error generating day ${dayNum} (attempt ${3 - retries}):`, err.message);
          retries--;
          if (retries === 0) {
            console.warn(`⚠️ Using default plan for day ${dayNum}`);
            dayPlan = this.generateDefaultDayPlan(dayNum);
          }
        }
      }

      // Generate images if TogetherAI is enabled
      if (process.env.TOGETHER_API_KEY && dayPlan?.meals) {
        console.log(`🎨 Generating images for day ${dayNum}...`);
        for (const [mealType, meal] of Object.entries(dayPlan.meals)) {
          try {
            console.log(`🖼️ Generating image for ${mealType} on day ${dayNum}...`);
            const imageData = await this.togetherAiService.generateRecipeImage(meal);
            const fileName = imageStorage.generateFileName(`meal-${dayNum}-${mealType}`);
            meal.image_url = await imageStorage.saveBase64Image(imageData, fileName);
            console.log(`✅ Successfully generated image for ${mealType} on day ${dayNum}`);
          } catch (error) {
            console.error(`⚠️ Failed to generate image for ${mealType} on day ${dayNum}:`, error.message);
          }
        }
      } else {
        console.log(`⏩ Skipping image generation for day ${dayNum} (no TOGETHER_API_KEY)`);
      }

      // Skip individual day storage during streaming to avoid duplicates
      console.log(`⏩ Skipping individual day storage for day ${dayNum} (streaming mode)`);
      // Individual days will be stored together in the complete plan at the end

      // Ensure unique day number and add metadata
      dayPlan.day = dayNum;
      dayPlan.generatedAt = new Date().toISOString();
      dayPlan.generatedWithStreaming = true;
      
      // Final fix to ensure ingredients are in proper object format
      dayPlan = this.fixDayPlan(dayPlan, dayNum);
      
      // Yield partial result
      console.log(`🎯 Yielding day ${dayNum} plan...`);
      yield dayPlan;
    }
    
    console.log(`🎉 Streaming generation complete for ${totalDays} days!`);
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
                // Skip ingredients without names
                if (!ingredient.name) {
                  console.warn('Skipping ingredient without name:', ingredient);
                  continue;
                }
                
                await db.query(
                  `INSERT INTO recipe_ingredients (
                    recipe_id, name, amount, unit, notes
                  )
                  VALUES ($1, $2, $3, $4, $5)`,
                  [
                    recipeId,
                    ingredient.name,
                    ingredient.amount || '1 serving',
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

                  // Verify the meal_plan_date_id exists before inserting meal
        const dateCheck = await db.query(
          'SELECT id FROM meal_plan_dates WHERE id = $1',
          [mealPlanDateId]
        );
        
        if (dateCheck.rows.length === 0) {
          throw new Error(`meal_plan_date_id ${mealPlanDateId} does not exist`);
        }

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

  // ORIGINAL: Traditional meal plan generation (kept for backward compatibility)
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
        model: "gpt-4o-mini",
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
            // Clean up old meal plans to prevent accumulation
            await this.cleanupOldMealPlans(preferences.userId);
            
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

  // NEW: Streaming meal plan generation for testing
  async generateMealPlanStreamingTest(preferences, totalDays = 7) {
    const allDays = [];
    console.log(`🚀 Starting streaming meal plan generation for ${totalDays} days...`);
    
    try {
      let dayCount = 0;
      // Skip individual day storage during streaming to avoid duplicates
      const streamingPreferences = { ...preferences, skipDbStorage: true };
      
      for await (const dayPlan of this.generateMealPlanStreaming(streamingPreferences, totalDays)) {
        dayCount++;
        allDays.push(dayPlan);
        console.log(`✅ Completed day ${dayPlan.day} (${allDays.length}/${totalDays})`);
        console.log(`📊 allDays now contains days: ${allDays.map(d => d.day).join(', ')}`);
        
        // Safety check to prevent infinite loops
        if (dayCount > totalDays) {
          console.warn(`⚠️ Generated more days than requested (${dayCount} > ${totalDays}), stopping`);
          break;
        }
      }
      
      console.log(`🎉 Streaming generation complete! Generated ${allDays.length} days out of ${totalDays} requested.`);
      
      // Check if we got all requested days
      if (allDays.length < totalDays) {
        console.warn(`⚠️ Only generated ${allDays.length} days out of ${totalDays} requested`);
      }
      
      // Store complete meal plan in database once (to avoid duplicates)
      if (preferences.userId && allDays.length > 0) {
        try {
          console.log(`💾 Storing complete streaming meal plan (${allDays.length} days) in database...`);
          
          // Clean up recent meal plans for this user to prevent too many duplicates
          await this.cleanupOldMealPlans(preferences.userId);
          
          const completeMealPlan = { days: allDays };
          const mealPlanId = await this.storeMealPlanInDatabase(completeMealPlan, preferences.userId, `Streaming Meal Plan - ${allDays.length} days`);
          console.log(`✅ Stored complete streaming meal plan with ID: ${mealPlanId}`);
        } catch (dbError) {
          console.error(`⚠️ Failed to store complete streaming meal plan:`, dbError.message);
        }
      }
      
      return { 
        days: allDays, 
        generatedWithStreaming: true,
        totalDays: allDays.length,
        requestedDays: totalDays,
        partial: allDays.length < totalDays
      };
    } catch (error) {
      console.error('❌ Streaming generation failed:', error);
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
      
      // If we managed to generate some days, return them
      if (allDays.length > 0) {
        console.log(`⚠️ Returning ${allDays.length} partially generated days`);
        return { 
          days: allDays, 
          generatedWithStreaming: true,
          totalDays: allDays.length,
          requestedDays: totalDays,
          partial: true,
          error: 'Partial generation due to error'
        };
      }
      
      // Complete fallback to existing method
      console.log('⚠️ Falling back to original generation method...');
      return await this.generateMealPlan(preferences);
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

  generateDefaultDayPlan(dayNum) {
    return {
      day: dayNum,
      meals: {
        breakfast: this.getDefaultMeal("Healthy Breakfast"),
        lunch: this.getDefaultMeal("Balanced Lunch"),
        dinner: this.getDefaultMeal("Nutritious Dinner")
      }
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
      nutrition: {
        protein_g: 25,
        carbs_g: 30,
        fat_g: 10,
        calories: 300
      }
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
    // Return TRUE if valid, FALSE if invalid
    if (!dayPlan || typeof dayPlan !== 'object') {
      console.warn(`❌ Invalid day plan for day ${dayNum}: not an object`, dayPlan);
      return false;
    }

    if (!dayPlan.meals || typeof dayPlan.meals !== 'object') {
      console.warn(`❌ Invalid day plan for day ${dayNum}: no meals object`, dayPlan);
      return false;
    }

    const meals = dayPlan.meals;
    const requiredMeals = ['breakfast', 'lunch', 'dinner'];
    
    for (const mealType of requiredMeals) {
      if (!meals[mealType]) {
        console.warn(`❌ Invalid day plan for day ${dayNum}: missing ${mealType}`, Object.keys(meals));
        return false;
      }
      
      const meal = meals[mealType];
      if (typeof meal !== 'object') {
        console.warn(`❌ Invalid day plan for day ${dayNum}: ${mealType} is not an object`, meal);
        return false;
      }
      
      // More lenient validation - just check for basic required fields
      if (!meal.name && !meal.title) {
        console.warn(`❌ Invalid day plan for day ${dayNum}: ${mealType} missing name/title`, meal);
        return false;
      }
      
      // Instructions and ingredients can be empty arrays/strings, just check they exist
      if (meal.ingredients === undefined && meal.instructions === undefined) {
        console.warn(`❌ Invalid day plan for day ${dayNum}: ${mealType} missing both ingredients and instructions`, meal);
        return false;
      }
    }

    console.log(`✅ Day plan validation passed for day ${dayNum}`);
    return true;
  }

  // NEW: Fix/sanitize day plan data
  fixDayPlan(dayPlan, dayNum) {
    const generateDefaultInstructions = (mealName, mealType) => {
      const instructions = {
        breakfast: `1. Prepare all ingredients for ${mealName}. 2. Heat pan or prepare cooking area. 3. Cook according to recipe requirements. 4. Season to taste and serve hot.`,
        lunch: `1. Gather all ingredients for ${mealName}. 2. Prep vegetables and proteins as needed. 3. Cook using appropriate method (sauté, grill, or assemble). 4. Combine ingredients and season. 5. Serve fresh.`,
        dinner: `1. Preheat oven or prepare cooking surface for ${mealName}. 2. Season and prepare protein. 3. Cook protein using specified method. 4. Prepare sides and vegetables. 5. Combine all components and serve hot.`
      };
      return instructions[mealType] || `1. Prepare ingredients for ${mealName}. 2. Cook according to recipe. 3. Season and serve.`;
    };

    const defaultMeal = {
      name: "Default meal",
      ingredients: [
        { name: "Protein", amount: "150g", notes: "Your choice of protein" },
        { name: "Vegetables", amount: "200g", notes: "Mixed vegetables" },
        { name: "Grains", amount: "100g", notes: "Your choice of grains" }
      ],
      instructions: "1. Prepare all ingredients. 2. Cook protein first. 3. Add vegetables and cook until tender. 4. Serve with grains.",
      difficulty: "Medium",
      prepTime: "30 minutes",
      nutrition: {
        protein_g: 25,
        carbs_g: 30,
        fat_g: 10,
        calories: 300
      }
    };

    if (!dayPlan || typeof dayPlan !== 'object') {
      console.log(`🔧 Creating completely new day plan for day ${dayNum}`);
      return {
        day: dayNum,
        meals: {
          breakfast: { ...defaultMeal, name: "Healthy Breakfast", instructions: generateDefaultInstructions("Healthy Breakfast", "breakfast") },
          lunch: { ...defaultMeal, name: "Balanced Lunch", instructions: generateDefaultInstructions("Balanced Lunch", "lunch") },
          dinner: { ...defaultMeal, name: "Nutritious Dinner", instructions: generateDefaultInstructions("Nutritious Dinner", "dinner") }
        }
      };
    }

    const meals = dayPlan.meals || {};
    const fixedMeals = {};
    
    ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
      const meal = meals[mealType];
      
      if (!meal || typeof meal !== 'object') {
        console.log(`🔧 Creating default ${mealType} for day ${dayNum}`);
        const mealName = `Default ${mealType}`;
        fixedMeals[mealType] = { 
          ...defaultMeal, 
          name: mealName,
          instructions: generateDefaultInstructions(mealName, mealType)
        };
      } else {
        // Fix existing meal
        let fixedIngredients = [];
        if (Array.isArray(meal.ingredients)) {
          fixedIngredients = meal.ingredients
            .map(ing => {
              // Handle string ingredients (like "1 cup Greek yogurt")
              if (typeof ing === 'string') {
                console.log(`🔧 Converting string ingredient: "${ing}"`);
                // Try to parse amount and name from string like "1 cup Greek yogurt"
                const match = ing.match(/^([\d\/.]+\s*\w*)\s+(.+)$/);
                if (match) {
                  return {
                    name: match[2].trim(),
                    amount: match[1].trim(),
                    notes: null
                  };
                } else {
                  // If no match, treat whole string as name
                  return {
                    name: ing,
                    amount: '1 serving',
                    notes: null
                  };
                }
              }
              
              // Handle object ingredients
              if (typeof ing === 'object' && ing !== null) {
                // Skip or fix ingredients without names
                if (!ing.name && !ing.item) {
                  console.warn(`🔧 Skipping ingredient without name in ${mealType} for day ${dayNum}:`, ing);
                  return null;
                }
                return {
                  name: ing.name || ing.item || 'Unknown ingredient',
                  amount: ing.amount || '1 serving',
                  unit: ing.unit || null,
                  notes: ing.notes || null
                };
              }
              
              console.warn(`🔧 Unknown ingredient format in ${mealType} for day ${dayNum}:`, ing);
              return null;
            })
            .filter(ing => ing !== null); // Remove null entries
        } else if (typeof meal.ingredients === 'string') {
          fixedIngredients = [{ name: meal.ingredients, amount: '1 serving' }];
        }
        
        const mealName = meal.name || meal.title || `Fixed ${mealType}`;
        const instructions = meal.instructions || generateDefaultInstructions(mealName, mealType);
        
        fixedMeals[mealType] = {
          name: mealName,
          ingredients: fixedIngredients,
          instructions: instructions,
          difficulty: meal.difficulty || "Medium", 
          prepTime: meal.prepTime || meal.prep_time || "30 minutes",
          nutrition: meal.nutrition || defaultMeal.nutrition,
          image_url: meal.image_url || undefined
        };

        // Log if we had to fix missing instructions
        if (!meal.instructions) {
          console.log(`🔧 Generated missing instructions for ${mealType} on day ${dayNum}: "${mealName}"`);
        }
      }
    });
    
    const fixed = {
      day: dayNum,
      meals: fixedMeals
    };
    
    console.log(`🔧 Fixed day plan for day ${dayNum}:`, JSON.stringify(fixed, null, 2));
    return fixed;
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

  async cleanupOldMealPlans(userId) {
    try {
      // First, get a list of what we're about to delete for logging
      const plansToDelete = await db.query(`
        SELECT id, title, start_date FROM meal_plans 
        WHERE user_id = $1 
        AND id NOT IN (
          SELECT id FROM meal_plans 
          WHERE user_id = $1 
          ORDER BY start_date DESC 
          LIMIT 5
        )
      `, [userId]);
      
      if (plansToDelete.rows.length > 0) {
        console.log(`🧹 About to clean up ${plansToDelete.rows.length} old meal plans:`, 
          plansToDelete.rows.map(p => `ID:${p.id} "${p.title}"`).join(', '));
      }
      
      // Keep only the 5 most recent meal plans for each user (increased from 3)
      const result = await db.query(`
        DELETE FROM meal_plans 
        WHERE user_id = $1 
        AND id NOT IN (
          SELECT id FROM meal_plans 
          WHERE user_id = $1 
          ORDER BY start_date DESC 
          LIMIT 5
        )
      `, [userId]);
      
      if (result.rowCount > 0) {
        console.log(`🧹 Cleaned up ${result.rowCount} old meal plans for user ${userId}`);
      } else {
        console.log(`🧹 No old meal plans to clean up for user ${userId}`);
      }
    } catch (error) {
      console.error('Error cleaning up old meal plans:', error);
      // Don't throw - cleanup failure shouldn't stop meal plan storage
    }
  }
}

module.exports = MealPlanGenerator;