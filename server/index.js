const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const ReceiptParser = require('./services/receiptParser');
const MealPlanGenerator = require('./services/mealPlanGenerator');
const crypto = require('crypto');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://meal-planner-frontend-woan.onrender.com'  // Frontend URL that will make requests
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],  // Add OPTIONS
  credentials: true,
  allowedHeaders: [
    'Content-Type', 
    'x-openai-key',
    'x-session-token'
  ],
  exposedHeaders: ['Content-Type'],
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

const sessions = new Map();

const getApiKey = (req) => {
  const sessionToken = req.headers['x-session-token'];
  const session = sessions.get(sessionToken);
  return session?.apiKey;
};

// Receipt parsing endpoint
app.post('/api/parse-receipt', upload.single('receipt'), async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  try {
    if (!req.file) {
      console.log('No file received');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', {
      path: req.file.path,
      size: req.file.size,
      type: req.file.mimetype,
      originalName: req.file.originalname
    });

    // Verify file exists before parsing
    if (!fs.existsSync(req.file.path)) {
      console.error('File not found after upload:', req.file.path);
      return res.status(500).json({ error: 'File not found after upload' });
    }

    const parser = new ReceiptParser(apiKey);
    
    try {
      // Read file contents before parsing
      const fileContents = await fs.promises.readFile(req.file.path);
      console.log('File size before parsing:', fileContents.length);

      const result = await parser.parseReceipt(req.file.path);
      console.log('Parse success:', result);
      res.json(result);
    } catch (parseError) {
      console.error('Parse error details:', {
        error: parseError.message,
        stack: parseError.stack,
        file: req.file
      });
      res.status(500).json({ 
        error: 'Failed to parse receipt',
        details: parseError.message,
        stack: parseError.stack
      });
    } finally {
      // Clean up file in finally block
      try {
        await fs.promises.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('File cleanup error:', unlinkError);
      }
    }
  } catch (error) {
    console.error('Request handling error:', {
      error: error.message,
      stack: error.stack,
      file: req?.file
    });
    res.status(500).json({ 
      error: 'Server error',
      details: error.message,
      stack: error.stack
    });
  }
});

// Meal plan generation endpoint
app.post('/api/generate-meal-plan', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  try {
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

app.post('/api/auth', (req, res) => {
  const { apiKey } = req.body;
  const sessionToken = crypto.randomUUID();
  sessions.set(sessionToken, {
    apiKey,
    createdAt: Date.now()
  });
  
  res.json({ sessionToken });
});

// Add near the top of your routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Add preflight handler for multipart/form-data
app.options('/api/parse-receipt', cors());

// Add a port configuration
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 