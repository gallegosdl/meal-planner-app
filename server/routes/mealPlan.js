const express = require('express');
const router = express.Router();
const MealPlanGenerator = require('../services/mealPlanGenerator');

// Middleware to get API key from request
const requireApiKey = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'API key is required' });
  }
  req.apiKey = Buffer.from(token, 'base64').toString();
  next();
};

// Generate meal plan route
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

// Compare meal plans from both providers
router.post('/compare-meal-plans', async (req, res) => {
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

module.exports = router; 