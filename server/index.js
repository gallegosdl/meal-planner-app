const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const ReceiptParser = require('./services/receiptParser');
const MealPlanGenerator = require('./services/mealPlanGenerator');
const crypto = require('crypto');
const instacartRoutes = require('./routes/instacart');
const recipesRouter = require('./routes/recipes');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();

// Near the top of server/index.js
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://meal-planner-frontend-woan.onrender.com';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: [
    'Content-Type', 
    'x-openai-key',
    'x-session-token',
    'Authorization'
  ]
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
app.set('sessions', sessions); // Make sessions available to routes

const getApiKey = (req) => {
  const sessionToken = req.headers['x-session-token'];
  const session = sessions.get(sessionToken);
  return session?.apiKey;
};

// Add this near the top after loading env vars
console.log('Server starting with env vars:', {
  INSTACART_API_KEY: process.env.INSTACART_API_KEY ? 'Present' : 'Missing',
  NODE_ENV: process.env.NODE_ENV
});

// Add deployment logging
console.log('Starting server with environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  CORS_ORIGIN: process.env.NODE_ENV === 'production' 
    ? 'https://meal-planner-frontend-woan.onrender.com'
    : 'http://localhost:3000'
});

// Add to server/index.js
const SESSION_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours

// Cleanup function
const cleanupSessions = () => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT) {
      sessions.delete(token);  // Remove expired sessions
    }
  }
};

// Run cleanup periodically
setInterval(cleanupSessions, 60 * 60 * 1000); // Every hour

// Add timeout check to auth middleware
const validateSession = (req, res, next) => {
  const token = req.headers['x-session-token'];
  const session = sessions.get(token);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }
  
  req.apiKey = session.apiKey;
  next();
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

// Authentication endpoint with OpenAI validation
app.post('/api/auth', async (req, res) => {
  const { apiKey } = req.body;
  
  try {
    // Create an OpenAI instance with the provided key
    const openai = new OpenAI({ apiKey });
    
    // Test the API key with a minimal API call
    // This verifies the key is valid without consuming much quota
    await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: "Test" }],
      max_tokens: 1
    });

    // If we get here, the key is valid
    // Generate a unique session token
    const sessionToken = crypto.randomUUID();
    
    // Store the session with the API key and timestamp
    sessions.set(sessionToken, {
      apiKey,
      createdAt: Date.now()
    });
    
    // Return only the session token to the client
    res.json({ sessionToken });
    
  } catch (error) {
    // Log error for debugging but send limited info to client
    console.error('Auth error:', error);
    res.status(401).json({ 
      error: 'Invalid API key',
      details: error.message 
    });
  }
});

// Add route logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

app.use('/api/instacart', instacartRoutes);
app.use('/api/recipes', recipesRouter);

// Add near the top of your routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    routes: {
      instacart: {
        create_link: 'POST /api/instacart/create-link',
        scrape_prices: 'POST /api/instacart/scrape-prices'
      }
    }
  });
});

// Add preflight handler for multipart/form-data
app.options('/api/parse-receipt', cors());

// Add a port configuration
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 