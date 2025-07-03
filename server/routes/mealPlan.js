// server/routes/mealPlan.js
const express = require('express');
const router = express.Router();
const MealPlanGenerator = require('../services/mealPlanGenerator');
const GoogleCalendarService = require('../services/googleCalendarService');
const PantryItem = require('../models/PantryItem');
const MealConsumption = require('../models/MealConsumption');
const { matchIngredientAmount, parseQuantityAndUnit } = require('../utils/parseQuantityAndUnit');

// Middleware to get API key from request
const requireApiKey = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'API key is required' });
  }
  req.apiKey = Buffer.from(token, 'base64').toString();
  next();
};

// Generate meal plan route (requires OpenAI API key)
router.post('/generate-meal-plan', requireApiKey, async (req, res) => {
  try {
    const mealPlanGenerator = new MealPlanGenerator(req.apiKey);
    
    // ORIGINAL: Uncomment line below to use original method
    // const mealPlan = await mealPlanGenerator.generateMealPlan(req.body);
    
    // NEW: Comment out lines below to test original method
    const useStreaming = req.body.useStreaming || false;
    const totalDays = req.body.totalDays || 2;
    
    let mealPlan;
    if (useStreaming) {
      console.log('🚀 Using NEW streaming meal plan generation');
      mealPlan = await mealPlanGenerator.generateMealPlanStreamingTest(req.body, totalDays);
    } else {
      console.log('📋 Using ORIGINAL meal plan generation');
      mealPlan = await mealPlanGenerator.generateMealPlan(req.body);
    }
    
    res.json(mealPlan);
  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ 
      error: 'Failed to generate meal plan',
      details: error.message 
    });
  }
});

// NEW: Test route for streaming meal plan generation
router.post('/generate-meal-plan-streaming', requireApiKey, async (req, res) => {
  try {
    const mealPlanGenerator = new MealPlanGenerator(req.apiKey);
    const totalDays = req.body.totalDays || 7;
    
    console.log(`🚀 Generating streaming meal plan for ${totalDays} days`);
    const mealPlan = await mealPlanGenerator.generateMealPlanStreamingTest(req.body, totalDays);
    res.json(mealPlan);
  } catch (error) {
    console.error('Error generating streaming meal plan:', error);
    res.status(500).json({ 
      error: 'Failed to generate streaming meal plan',
      details: error.message 
    });
  }
});

// Get user's meal plans (no API key needed, just needs auth)
router.get('/user-meal-plans/:userId?', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.params.userId || req.user?.id;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Initialize without API key since we're just querying the database
    const mealPlanGenerator = new MealPlanGenerator();
    const mealPlans = await mealPlanGenerator.getMealPlansForUser(
      userId,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    res.json(mealPlans);
  } catch (error) {
    console.error('Error retrieving meal plans:', error);
    res.status(500).json({
      error: 'Failed to retrieve meal plans',
      details: error.message
    });
  }
});

// Add note to meal (no API key needed, just needs auth)
router.post('/meal-notes', async (req, res) => {
  try {
    const { mealPlanMealId, rating, comment } = req.body;

    // Validate input
    if (!mealPlanMealId) {
      return res.status(400).json({ error: 'mealPlanMealId is required' });
    }
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Initialize without API key since we're just storing a note
    const mealPlanGenerator = new MealPlanGenerator();
    const note = await mealPlanGenerator.addMealNote(mealPlanMealId, rating, comment);
    res.json(note);
  } catch (error) {
    console.error('Error adding meal note:', error);
    res.status(500).json({
      error: 'Failed to add meal note',
      details: error.message
    });
  }
});

// Compare meal plans from both providers (requires OpenAI API key)
// TODO: This route is currently disabled due to missing mealPlanService import
// router.post('/compare-meal-plans', requireApiKey, async (req, res) => {
//   // Implementation temporarily disabled
//   res.status(501).json({ error: 'Meal plan comparison is not yet implemented' });
// });

// Sync meal plan to Google Calendar
router.post('/sync-to-calendar', async (req, res) => {
  try {
    const { mealPlanId, accessToken } = req.body;
    
    if (!mealPlanId || !accessToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Initialize services
    const mealPlanGenerator = new MealPlanGenerator();
    const calendarService = new GoogleCalendarService();

    // Get meal plan data
    const mealPlan = await mealPlanGenerator.getMealPlansForUser(req.user.id, null, null);
    const targetPlan = mealPlan.find(plan => plan.id === mealPlanId);

    if (!targetPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Sync to Google Calendar
    const events = await calendarService.syncMealPlanToCalendar(accessToken, targetPlan);
    
    res.json({
      success: true,
      message: 'Meal plan synced to calendar',
      events
    });
  } catch (error) {
    console.error('Failed to sync meal plan to calendar:', error);
    res.status(500).json({
      error: 'Failed to sync meal plan to calendar',
      details: error.message
    });
  }
});

// Mark meal as consumed and reduce pantry items
router.post('/consume-meal', async (req, res) => {
  try {
    const { eventId, userId, meal } = req.body;
    
    if (!eventId || !userId || !meal) {
      return res.status(400).json({ error: 'Missing required fields: eventId, userId, meal' });
    }

    console.log('Processing meal consumption:', { eventId, userId, mealName: meal.name });

    // Get the recipe ingredients
    const ingredients = meal.ingredients || [];
    console.log('Recipe ingredients:', ingredients);

    // Get user's current pantry items
    const pantryItems = await PantryItem.findAll({
      where: { user_id: userId }
    });

    console.log('Current pantry items:', pantryItems.length);

    // Enhanced ingredient matching function
    const findMatchingPantryItem = (ingredientName, pantryItems) => {
      const ingredient = ingredientName.toLowerCase().trim();
      
      // Remove common suffixes and prefixes that might not match
      const cleanIngredient = ingredient
        .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses content
        .replace(/\s*(to taste|fresh|dried|ground|whole|chopped|diced|sliced|minced)\s*/g, '') // Remove common modifiers
        .replace(/\s*,.*$/g, '') // Remove comma and everything after
        .trim();

      // Try different matching strategies
      const strategies = [
        // 1. Exact match
        (ingredient, pantryName) => pantryName === ingredient,
        
        // 2. Cleaned exact match
        (ingredient, pantryName) => pantryName === cleanIngredient,
        
        // 3. Ingredient contains pantry item (for compound ingredients)
        (ingredient, pantryName) => ingredient.includes(pantryName) && pantryName.length > 2,
        
        // 4. Pantry item contains ingredient (for generic pantry items)
        (ingredient, pantryName) => pantryName.includes(ingredient) && ingredient.length > 2,
        
        // 5. Cleaned ingredient contains pantry item
        (ingredient, pantryName) => cleanIngredient.includes(pantryName) && pantryName.length > 2,
        
        // 6. Pantry item contains cleaned ingredient
        (ingredient, pantryName) => pantryName.includes(cleanIngredient) && cleanIngredient.length > 2,
        
        // 7. Fuzzy matching for common variations
        (ingredient, pantryName) => {
          const variations = [
            [/\bchicken\b/, /\bchicken breast\b|\bchicken thigh\b/],
            [/\bonion\b/, /\bonions\b|\byellow onion\b|\bwhite onion\b/],
            [/\bgarlic\b/, /\bgarlic clove\b|\bgarlic powder\b/],
            [/\btomato\b/, /\btomatoes\b|\btomato paste\b/],
            [/\bbell pepper\b/, /\bred pepper\b|\bgreen pepper\b|\byellow pepper\b/],
            [/\brice\b/, /\bwhite rice\b|\bbrown rice\b|\bbasmati rice\b/],
            [/\bsalt\b/, /\bsea salt\b|\btable salt\b|\bkosher salt\b/],
            [/\bpepper\b/, /\bblack pepper\b|\bwhite pepper\b|\bground pepper\b/]
          ];
          
          for (const [pattern, variations] of variations) {
            if (pattern.test(ingredient) && variations.test(pantryName)) {
              return true;
            }
            if (pattern.test(pantryName) && variations.test(ingredient)) {
              return true;
            }
          }
          return false;
        }
      ];

      // Try each strategy
      for (const strategy of strategies) {
        const match = pantryItems.find(item => {
          const pantryName = item.item_name.toLowerCase().trim();
          return strategy(ingredient, pantryName);
        });
        
        if (match) {
          console.log(`Matched "${ingredientName}" to "${match.item_name}" using strategy`);
          return match;
        }
      }

      return null;
    };

    // Process each ingredient and reduce from pantry if available
    const reductionLog = [];
    const insufficientItems = [];
    const noMatchItems = [];
    const unitConversionLog = [];

    for (const ingredient of ingredients) {
      const ingredientName = ingredient.name;
      console.log('Processing ingredient:', ingredientName);

      // Find matching pantry item using enhanced matching
      const matchingPantryItem = findMatchingPantryItem(ingredientName, pantryItems);

      if (matchingPantryItem) {
        console.log('Found matching pantry item:', matchingPantryItem.item_name, 'Current quantity:', matchingPantryItem.quantity);
        
        // Use unit-aware matching if both ingredient and pantry item have units
        if (ingredient.amount && matchingPantryItem.unit) {
          const matchResult = matchIngredientAmount(
            ingredient.amount,
            matchingPantryItem.quantity,
            matchingPantryItem.unit
          );
          
          unitConversionLog.push({
            ingredient: ingredient.name,
            recipeAmount: ingredient.amount,
            pantryItem: matchingPantryItem.item_name,
            pantryQuantity: matchingPantryItem.quantity,
            pantryUnit: matchingPantryItem.unit,
            ...matchResult
          });
          
          if (matchResult.canUse) {
            // Reduce the quantity using converted amount
            const reductionAmount = matchResult.convertedAmount;
            const newQuantity = matchingPantryItem.quantity - reductionAmount;
            await matchingPantryItem.update({ quantity: newQuantity });
            
            reductionLog.push({
              ingredient: ingredient.name,
              ingredientAmount: ingredient.amount,
              pantryItem: matchingPantryItem.item_name,
              reduced: reductionAmount,
              remainingQuantity: newQuantity,
              unitConversion: matchResult.message
            });

            console.log(`Reduced ${matchingPantryItem.item_name} by ${reductionAmount} ${matchingPantryItem.unit}, remaining: ${newQuantity}`);
          } else {
            insufficientItems.push({
              ingredient: ingredient.name,
              ingredientAmount: ingredient.amount,
              pantryItem: matchingPantryItem.item_name,
              requested: matchResult.convertedAmount,
              available: matchingPantryItem.quantity,
              unit: matchingPantryItem.unit,
              conversionMessage: matchResult.message
            });

            console.log(`Insufficient quantity for ${matchingPantryItem.item_name}: ${matchResult.message}`);
          }
        } else {
          // Fallback to basic quantity parsing for items without proper units
          const basicQuantity = parseQuantityAndUnit(ingredient.amount ? `(${ingredient.amount})` : '(1)').quantity;
          const reductionAmount = Math.max(1, Math.floor(basicQuantity));

          if (matchingPantryItem.quantity >= reductionAmount) {
            // Reduce the quantity
            const newQuantity = matchingPantryItem.quantity - reductionAmount;
            await matchingPantryItem.update({ quantity: newQuantity });
            
            reductionLog.push({
              ingredient: ingredient.name,
              ingredientAmount: ingredient.amount,
              pantryItem: matchingPantryItem.item_name,
              reduced: reductionAmount,
              remainingQuantity: newQuantity,
              unitConversion: 'Basic quantity parsing (no unit conversion)'
            });

            console.log(`Reduced ${matchingPantryItem.item_name} by ${reductionAmount}, remaining: ${newQuantity}`);
          } else {
            insufficientItems.push({
              ingredient: ingredient.name,
              ingredientAmount: ingredient.amount,
              pantryItem: matchingPantryItem.item_name,
              requested: reductionAmount,
              available: matchingPantryItem.quantity,
              unit: matchingPantryItem.unit || 'units',
              conversionMessage: 'Basic quantity parsing (no unit conversion)'
            });

            console.log(`Insufficient quantity for ${matchingPantryItem.item_name}: requested ${reductionAmount}, available ${matchingPantryItem.quantity}`);
          }
        }
      } else {
        noMatchItems.push({
          ingredient: ingredient.name,
          ingredientAmount: ingredient.amount
        });
        console.log('No matching pantry item found for:', ingredientName);
      }
    }

    // Create consumption result object
    const consumptionResult = {
      reductionLog,
      insufficientItems,
      noMatchItems,
      unitConversionLog,
      summary: {
        totalReductions: reductionLog.length,
        totalInsufficientItems: insufficientItems.length,
        totalNoMatchItems: noMatchItems.length,
        totalIngredients: ingredients.length,
        successRate: Math.round((reductionLog.length / ingredients.length) * 100),
        unitConversionsUsed: unitConversionLog.filter(log => log.canUse).length
      }
    };

    // Record the consumption event in the database
    try {
      const consumptionRecord = await MealConsumption.recordConsumption(
        userId,
        eventId,
        meal.name,
        consumptionResult
      );
      console.log('Consumption event recorded:', consumptionRecord.id);
    } catch (trackingError) {
      console.error('Error recording consumption event:', trackingError);
      // Don't fail the entire operation if tracking fails
    }

    res.json({
      success: true,
      message: 'Meal marked as consumed',
      eventId,
      ...consumptionResult
    });

  } catch (error) {
    console.error('Error processing meal consumption:', error);
    res.status(500).json({
      error: 'Failed to process meal consumption',
      details: error.message
    });
  }
});

// Get consumption statistics for a user
router.get('/consumption-stats/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const { startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const stats = await MealConsumption.getConsumptionStats(userId, start, end);
    
    res.json({
      success: true,
      stats,
      period: {
        startDate: start,
        endDate: end
      }
    });
  } catch (error) {
    console.error('Error fetching consumption stats:', error);
    res.status(500).json({
      error: 'Failed to fetch consumption statistics',
      details: error.message
    });
  }
});

module.exports = router; 