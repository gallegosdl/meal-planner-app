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
    ? 'https://meal-planner-frontend-woan.onrender.com'  // Frontend URL that will make requests
    : 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Add after the CORS middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// Near the top after imports
const uploadDir = path.join(__dirname, 'uploads');

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Receipt parsing endpoint
app.post('/api/parse-receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      console.log('No file received');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', {
      path: req.file.path,
      size: req.file.size,
      type: req.file.mimetype
    });

    const parser = new ReceiptParser();
    
    try {
      const result = await parser.parseReceipt(req.file.path);
      console.log('Parse success:', result);
      res.json(result);
    } catch (parseError) {
      console.error('Parse error details:', parseError);
      res.status(500).json({ 
        error: 'Failed to parse receipt',
        details: parseError.message,
        stack: parseError.stack
      });
    }

    // Clean up file after response is sent
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('File cleanup error:', err);
    });

  } catch (error) {
    console.error('Request handling error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message,
      stack: error.stack
    });
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

// Add near the top of your routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Add a port configuration
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 