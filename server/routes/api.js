const express = require('express');
const multer = require('multer');
const ReceiptParser = require('../services/receiptParser');
const MealPlanGenerator = require('../services/mealPlanGenerator');
const fs = require('fs');
const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      cb(null, Date.now() + '.png')
    }
  })
});

router.post('/parse-receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file:', req.file.path);
    
    const parser = new ReceiptParser();
    const result = await parser.parseReceipt(req.file.path);
    
    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.json(result);
  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      stack: error.stack,
      details: error.response?.data
    });
    
    res.status(500).json({ 
      error: 'Failed to parse receipt',
      details: error.message
    });
    
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// Generate meal plan route with session-based auth
router.post('/generate-meal-plan', async (req, res) => {
  // Get API key from session
  const token = req.headers['x-session-token'];
  const session = req.app.get('sessions').get(token);
  
  if (!session?.apiKey) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  try {
    const generator = new MealPlanGenerator(session.apiKey);
    // Add userId to the request body
    // Get userId from either session or request body
    const userId = session.userId || req.body.userId;
    if (!userId) {
      console.warn('No userId found in session or request');
    }
    
    const requestWithUserId = {
      ...req.body,
      userId // Use userId from either source
    };
    console.log('Generating meal plan with user ID:', userId);
    const mealPlan = await generator.generateMealPlan(requestWithUserId);
    res.json(mealPlan);
  } catch (error) {
    console.error('Meal plan generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate meal plan',
      details: error.message
    });
  }
});

module.exports = router; 