// server/routes/mealPlan.js
const express = require('express');
const router = express.Router();
const MealPlanGenerator = require('../services/mealPlanGenerator');
const GoogleCalendarService = require('../services/googleCalendarService');
const PantryItem = require('../models/PantryItem');

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
    const mealPlan = await mealPlanGenerator.generateMealPlan(req.body);
    res.json(mealPlan);
  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ 
      error: 'Failed to generate meal plan',
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
router.post('/compare-meal-plans', requireApiKey, async (req, res) => {
  try {
    console.log('Starting meal plan comparison...');
    const [openaiPlan, fatsecretPlan] = await Promise.all([
      mealPlanService.generateMealPlan({ ...req.body, provider: 'openai' }),
      mealPlanService.generateMealPlan({ ...req.body, provider: 'fatsecret' })
    ]);

    const comparisonData = {
      days: openaiPlan.days.map((day, dayIndex) => ({
        day: day.day,
        meals: {
          breakfast: {
            openai: day.meals.breakfast,
            fatsecret: fatsecretPlan.days[dayIndex]?.meals?.breakfast || null
          },
          lunch: {
            openai: day.meals.lunch,
            fatsecret: fatsecretPlan.days[dayIndex]?.meals?.lunch || null
          },
          dinner: {
            openai: day.meals.dinner,
            fatsecret: fatsecretPlan.days[dayIndex]?.meals?.dinner || null
          }
        }
      }))
    };

    res.json(comparisonData);
  } catch (error) {
    console.error('Error comparing meal plans:', error);
    res.status(500).json({ 
      error: 'Failed to compare meal plans',
      details: error.message 
    });
  }
});

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

    // Process each ingredient and reduce from pantry if available
    const reductionLog = [];
    const insufficientItems = [];

    for (const ingredient of ingredients) {
      const ingredientName = ingredient.name.toLowerCase().trim();
      console.log('Processing ingredient:', ingredientName);

      // Find matching pantry item (fuzzy matching)
      const matchingPantryItem = pantryItems.find(pantryItem => {
        const pantryName = pantryItem.item_name.toLowerCase().trim();
        // Check for exact match or if ingredient name contains pantry item name
        return pantryName === ingredientName || 
               ingredientName.includes(pantryName) || 
               pantryName.includes(ingredientName);
      });

      if (matchingPantryItem) {
        console.log('Found matching pantry item:', matchingPantryItem.item_name, 'Current quantity:', matchingPantryItem.quantity);
        
        // Calculate reduction amount (default to 1 if we can't parse the amount)
        let reductionAmount = 1;
        if (ingredient.amount) {
          const amountMatch = ingredient.amount.match(/(\d+(?:\.\d+)?)/);
          if (amountMatch) {
            reductionAmount = Math.max(1, Math.floor(parseFloat(amountMatch[1])));
          }
        }

        if (matchingPantryItem.quantity >= reductionAmount) {
          // Reduce the quantity
          const newQuantity = matchingPantryItem.quantity - reductionAmount;
          await matchingPantryItem.update({ quantity: newQuantity });
          
          reductionLog.push({
            ingredient: ingredient.name,
            pantryItem: matchingPantryItem.item_name,
            reduced: reductionAmount,
            remainingQuantity: newQuantity
          });

          console.log(`Reduced ${matchingPantryItem.item_name} by ${reductionAmount}, remaining: ${newQuantity}`);
        } else {
          insufficientItems.push({
            ingredient: ingredient.name,
            pantryItem: matchingPantryItem.item_name,
            requested: reductionAmount,
            available: matchingPantryItem.quantity
          });

          console.log(`Insufficient quantity for ${matchingPantryItem.item_name}: requested ${reductionAmount}, available ${matchingPantryItem.quantity}`);
        }
      } else {
        console.log('No matching pantry item found for:', ingredientName);
      }
    }

    // TODO: Record the consumption event in a meal_consumption table for tracking
    // This would be useful for analytics and meal history

    res.json({
      success: true,
      message: 'Meal marked as consumed',
      eventId,
      reductionLog,
      insufficientItems,
      totalReductions: reductionLog.length,
      totalIngredients: ingredients.length
    });

  } catch (error) {
    console.error('Error processing meal consumption:', error);
    res.status(500).json({
      error: 'Failed to process meal consumption',
      details: error.message
    });
  }
});

module.exports = router; 