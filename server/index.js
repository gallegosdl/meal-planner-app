const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const ReceiptParser = require('./services/receiptParser');
const MealPlanGenerator = require('./services/mealPlanGenerator');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://meal-planner-app-frontend-s4ga.onrender.com'
    : 'http://localhost:3000'
}));
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Receipt parsing endpoint
app.post('/api/parse-receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file:', req.file.path);
    const parser = new ReceiptParser();
    
    try {
      const result = await parser.parseReceipt(req.file.path);
      console.log('Parsed result:', result);
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json(result);
    } catch (parseError) {
      console.error('Receipt parsing error:', parseError);
      res.status(500).json({ error: 'Failed to parse receipt', details: parseError.message });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Meal plan generation endpoint
app.post('/api/generate-meal-plan', async (req, res) => {
  try {
    const apiKey = req.headers['x-openai-key'];
    
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'API key required',
        details: 'Please provide your OpenAI API key' 
      });
    }

    const mealPlanGenerator = new MealPlanGenerator(apiKey);
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

// Add a port configuration
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 