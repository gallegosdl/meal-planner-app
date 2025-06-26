const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const ReceiptParser = require('./services/receiptParser');
const crypto = require('crypto');
const instacartRoutes = require('./routes/instacart');
const recipesRouter = require('./routes/recipes');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const cookieParser = require('cookie-parser');
const OpenAI = require('openai');
const pantryRoutes = require('./routes/pantry');
const fitbitRoutes = require('./routes/fitbit');
const stravaRoutes = require('./routes/strava');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
require('dotenv').config({ path: './server/.env' });

const app = express();

// Define the frontend origin based on environment
const FRONTEND_ORIGIN = process.env.NODE_ENV === 'production'
  ? 'https://meal-planner-frontend-woan.onrender.com'
  : 'http://localhost:3000';

// Middleware
const allowedOrigins = [
  FRONTEND_ORIGIN,
  'http://localhost:3000',
  'http://localhost:3001',
  'https://www.fitbit.com',
  'https://www.strava.com'
];

// Add CORS configuration before routes
app.use(cors({
  origin: function(origin, callback) {
    // Always allow requests with no origin (like OAuth redirects)
    if (!origin) {
      console.log('Allowing request with no origin');
      return callback(null, true);
    }
    // Check if origin starts with any allowed origin
    const isAllowed = allowedOrigins.some(allowed => 
      origin === allowed || origin.startsWith(allowed)
    );
    if (isAllowed) {
      console.log('Allowing origin:', origin);
      return callback(null, true);
    }
    console.log('Rejected origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'x-openai-key',
    'x-session-token',
    'Authorization',
    'Cookie',
    'Origin',
    'Accept'
  ],
  exposedHeaders: ['Set-Cookie']
}));

// Add preflight handler for all routes
app.options('*', cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', err => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

// Connect to Redis and initialize session store
const initializeRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Redis client connected successfully');

    // Create Redis store
    const redisStore = new RedisStore({
      client: redisClient,
      prefix: "mealplanner:",
      ttl: 86400 // 24 hours
    });

    // Use Redis-backed session store
    app.use(session({
      store: redisStore,
      secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
      resave: true, // Changed to true to ensure session is saved
      saveUninitialized: true, // Changed to true to ensure new sessions are saved
      name: 'mealplanner.sid',
      proxy: true, // Required for secure cookies behind proxy
      rolling: true, // Refresh session with each request
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined,
        path: '/'
      }
    }));

    // Add cookie parser before routes
    app.use(cookieParser());

    // Debug middleware for session tracking
    app.use((req, res, next) => {
      console.log('Session Debug:', {
        id: req.sessionID,
        hasSession: !!req.session,
        cookie: req.session?.cookie,
        headers: {
          cookie: req.headers.cookie,
          origin: req.headers.origin,
          referer: req.headers.referer
        }
      });
      next();
    });

    // Near the top after imports
    const uploadDir = path.join(__dirname, 'uploads');
    const recipeUploadsDir = path.join(uploadDir, 'recipes');

    // Create uploads directories if they don't exist
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(recipeUploadsDir)) {
      fs.mkdirSync(recipeUploadsDir, { recursive: true });
    }

    // Serve static files from uploads directory with proper CORS
    app.use('/uploads', (req, res, next) => {
      res.header('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
        ? 'https://meal-planner-frontend-woan.onrender.com'
        : 'http://localhost:3000');
      res.header('Access-Control-Allow-Credentials', 'true');
      next();
    }, express.static(uploadDir));

    // Mount routes
    app.use('/api/auth', authRoutes);
    app.use('/api/recipes', recipesRouter);
    app.use('/api/instacart', instacartRoutes);
    app.use('/api', apiRoutes);
    app.use('/api/pantry', pantryRoutes);
    app.use('/api/fitbit', fitbitRoutes);
    app.use('/api/strava', stravaRoutes);

    // Add route logging
    app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
      next();
    });

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

    // Add a port configuration
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: 'Something went wrong!' });
    });

  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    process.exit(1);
  }
};

// Start the server
initializeRedis().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

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

// Authentication endpoint with OpenAI validation
app.post('/api/auth', async (req, res) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    // Create an OpenAI instance with the provided key
    const openai = new OpenAI({ apiKey });
    
    // Test the API key with a minimal API call
    await openai.models.list();

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

// Validate existing session
app.post('/api/auth/validate', (req, res) => {
  const token = req.headers['x-session-token'];
  const session = sessions.get(token);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }
  
  res.json({ valid: true });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const token = req.headers['x-session-token'];
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true });
});

// Add debug logging for Strava env vars
console.log('Strava Configuration:', {
  CLIENT_ID: process.env.STRAVA_CLIENT_ID ? 'Present' : 'Missing',
  CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET ? 'Present' : 'Missing'
}); 