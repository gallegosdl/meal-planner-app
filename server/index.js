// server/index.js
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const crypto = require('crypto');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const ReceiptParser = require('./services/receiptParser');
const instacartRoutes = require('./routes/instacart');
const recipesRouter = require('./routes/recipes');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const cookieParser = require('cookie-parser');
const OpenAI = require('openai');
const pantryRoutes = require('./routes/pantry');
const fitbitRoutes = require('./routes/fitbit');
const stravaRoutes = require('./routes/strava');
const mealPlanRoutes = require('./routes/mealPlan');
//const mapMyFitnessRoutes = require('./routes/mapmyfitness');
const parseIntentRoutes = require('./routes/parseIntentRoutes');
require('dotenv').config({ path: './server/.env' });

const app = express();
const sessions = new Map();
app.set('sessions', sessions);

// ENV + CORS
const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_ORIGIN = isProduction
  ? 'https://meal-planner-frontend-woan.onrender.com'
  : 'http://localhost:3000';

const allowedOrigins = [
  FRONTEND_ORIGIN,
  'http://localhost:3000',
  'http://localhost:3001',
  'https://www.fitbit.com',
  'https://www.strava.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed =>
      origin === allowed || origin.startsWith(allowed)
    );
    if (isAllowed) return callback(null, true);
    console.log('Rejected origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-openai-key', 'x-session-token', 'Authorization', 'Cookie', 'Origin', 'Accept'],
  exposedHeaders: ['Set-Cookie']
}));

app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redis client (conditionally initialized)
const redisClient = isProduction
  ? createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: true,
        rejectUnauthorized: false
      }
    })
  : null;

if (redisClient) {
  redisClient.on('error', err => console.log('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Connected to Redis'));
  redisClient.on('ready', () => console.log('Redis client ready'));
}

const initializeRedis = async () => {
  try {
    if (isProduction) {
      await redisClient.connect();
      console.log('✅ Redis client connected');
      
      // Make Redis client available globally for OAuth state management
      global.redisClient = redisClient;

      const redisStore = new RedisStore({
        client: redisClient,
        prefix: "mealplanner:",
        ttl: 86400,
        disableTouch: false
      });

      app.use(session({
        store: redisStore,
        secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
        resave: false,
        saveUninitialized: false,
        name: 'mealplanner.sid',
        proxy: true,
        rolling: true,
        cookie: {
          secure: true,
          httpOnly: true,
          sameSite: 'none',
          maxAge: 24 * 60 * 60 * 1000,
          path: '/'
        }
      }));
    } else {
      console.warn('⚠ Redis not used in development. Using in-memory session store.');
      app.use(session({
        secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
        resave: false,
        saveUninitialized: false,
        name: 'mealplanner.sid',
        cookie: {
          secure: false,
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000,
          path: '/'
        }
      }));
    }

    app.use(cookieParser());
    initializeApp();

  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    process.exit(1);
  }
};

const initializeApp = () => {
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

  const fs = require('fs');
  const uploadDir = path.join(__dirname, 'uploads');
  const recipeUploadsDir = path.join(uploadDir, 'recipes');

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(recipeUploadsDir)) fs.mkdirSync(recipeUploadsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage });

  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', isProduction ? 'https://meal-planner-frontend-woan.onrender.com' : 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
  }, express.static(uploadDir));

  // Mount auth routes on both paths to handle callbacks
  app.use('/auth', authRoutes);
  app.use('/api/auth', authRoutes);

  app.use('/api/recipes', recipesRouter);
  app.use('/api/instacart', instacartRoutes);
  app.use('/api', apiRoutes);
  app.use('/api/pantry', pantryRoutes);
  app.use('/api/fitbit', fitbitRoutes);
  app.use('/api/strava', stravaRoutes);
  app.use('/api/meal-plans', mealPlanRoutes);
  //app.use('/api/mapmyfitness', mapMyFitnessRoutes);
  app.use('/api/parse-intent', parseIntentRoutes);
  

  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
    next();
  });

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

  app.get('/data-deletion', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Nutri IQ - Data Deletion Instructions</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background-color: #f9f9f9;
          }
          h1 {
            color: #007bff;
          }
          p {
            margin-bottom: 1em;
          }
        </style>
      </head>
      <body>
        <h1>Nutri IQ - Data Deletion Instructions</h1>
        <p>We respect your privacy and are committed to protecting your data.</p>
        <p>To request deletion of your personal data associated with Nutri IQ, please contact us at:</p>
        <p><strong>Email:</strong> gallegosdl1975@gmail.com</p>
        <p>We will process your request and confirm deletion within 30 days.</p>
      </body>
      </html>
    `);
  });
  

  app.post('/api/parse-receipt', upload.single('receipt'), async (req, res) => {
    const apiKey = getApiKey(req);
    if (!apiKey) return res.status(401).json({ error: 'Invalid session' });

    try {
      const fs = require('fs');
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      if (!fs.existsSync(req.file.path)) return res.status(500).json({ error: 'File not found after upload' });

      const parser = new ReceiptParser(apiKey);
      const result = await parser.parseReceipt(req.file.path);
      res.json(result);

      await fs.promises.unlink(req.file.path);
    } catch (err) {
      console.error('Receipt parsing failed:', err);
      res.status(500).json({ error: err.message || 'Parse failed' });
    }
  });

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

initializeRedis();

console.log('Server starting with env vars:', {
  INSTACART_API_KEY: process.env.INSTACART_API_KEY ? 'Present' : 'Missing',
  NODE_ENV: process.env.NODE_ENV
});

console.log('Starting server with environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  CORS_ORIGIN: FRONTEND_ORIGIN
});

console.log('Strava Configuration:', {
  CLIENT_ID: process.env.STRAVA_CLIENT_ID ? 'Present' : 'Missing',
  CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET ? 'Present' : 'Missing'
});

const SESSION_TIMEOUT = 4 * 60 * 60 * 1000;

const cleanupSessions = () => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT) {
      sessions.delete(token);
    }
  }
};
setInterval(cleanupSessions, 60 * 60 * 1000);

const validateSession = (req, res, next) => {
  const token = req.headers['x-session-token'];
  const session = sessions.get(token);

  if (!session || (Date.now() - session.createdAt > SESSION_TIMEOUT)) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  req.apiKey = session.apiKey;
  next();
};

function getApiKey(req) {
  const token = req.headers['x-session-token'];
  const session = sessions.get(token);
  return session?.apiKey;
}
