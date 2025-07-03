const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../services/database');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { hash } = require('../utils/crypto');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../services/email');
const fetch = require('node-fetch');
const axios = require('axios');
const { TwitterApi } = require('twitter-api-v2');

// Configure protection middleware
const csrfProtection = csrf({ cookie: true });
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests per windowMs
});

// OAuth-specific rate limiter (configurable via environment)
const oauthLimiter = rateLimit({
  windowMs: parseInt(process.env.OAUTH_RATE_LIMIT_WINDOW_MS) || (15 * 60 * 1000), // 15 minutes default
  max: parseInt(process.env.OAUTH_RATE_LIMIT_MAX) || 10, // 10 attempts default
  message: { error: 'Too many OAuth attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.OAUTH_REDIRECT_URI
);

// Initialize Twitter client for OAuth 2.0
const twitterClient = new TwitterApi({ 
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET 
});

// Create a client factory to ensure consistent configuration
const createTwitterClient = (token = null) => {
  if (token) {
    return new TwitterApi(token);
  }
  return new TwitterApi({ 
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET 
  });
};

// Secure OAuth state storage
class OAuthStateManager {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Always initialize memory store as fallback
    this.memoryStore = new Map();
    
    if (this.isProduction) {
      // In production, prefer Redis but fallback to memory if Redis not ready
      this.useRedis = true;
    } else {
      // In development, use in-memory only
      this.useRedis = false;
    }
      
    // Clean up expired states every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.memoryStore.entries()) {
        if (now > value.expires) {
          this.memoryStore.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  async store(state, data, ttlMinutes = 10) {
    const expires = Date.now() + (ttlMinutes * 60 * 1000);
    const storeData = { ...data, expires };

    if (this.useRedis && global.redisClient && global.redisClient.isReady) {
      // Store in Redis with TTL
      const key = `oauth:x:${state}`;
      await global.redisClient.setEx(key, ttlMinutes * 60, JSON.stringify(storeData));
      console.log('✅ OAuth state stored in Redis:', { state, key });
    } else {
      // Store in memory (fallback)
      if (!this.memoryStore) this.memoryStore = new Map();
      this.memoryStore.set(state, storeData);
      console.log('✅ OAuth state stored in memory:', { state, useRedis: this.useRedis, redisReady: global.redisClient?.isReady });
    }
  }

  async get(state) {
    if (this.useRedis && global.redisClient && global.redisClient.isReady) {
      try {
        const key = `oauth:x:${state}`;
        const data = await global.redisClient.get(key);
        console.log('🔍 OAuth state retrieval from Redis:', { state, key, found: !!data });
        if (!data) return null;
        
        const parsed = JSON.parse(data);
        // Check if expired (Redis TTL should handle this, but double-check)
        if (Date.now() > parsed.expires) {
          await this.delete(state);
          return null;
        }
        return parsed;
      } catch (error) {
        console.error('Redis get error:', error);
        return null;
      }
    } else {
      // Fallback to memory store
      if (!this.memoryStore) this.memoryStore = new Map();
      const data = this.memoryStore.get(state);
      console.log('🔍 OAuth state retrieval from memory:', { state, found: !!data, useRedis: this.useRedis, redisReady: global.redisClient?.isReady });
      if (!data) return null;
      
      // Check if expired
      if (Date.now() > data.expires) {
        this.memoryStore.delete(state);
        return null;
      }
      return data;
    }
  }

  async delete(state) {
    if (this.useRedis && global.redisClient && global.redisClient.isReady) {
      const key = `oauth:x:${state}`;
      await global.redisClient.del(key);
    } else {
      // Fallback to memory store
      if (!this.memoryStore) this.memoryStore = new Map();
      this.memoryStore.delete(state);
    }
  }

  getStoreSize() {
    if (this.useRedis) {
      return 'Redis (production)';
    } else {
      return this.memoryStore.size;
    }
  }
}

const oauthStateManager = new OAuthStateManager();

// Security monitoring for OAuth attempts
const oauthMonitor = {
  attempts: new Map(),
  
  logAttempt(ip, userAgent, success = true) {
    const key = `${ip}:${userAgent}`;
    if (!this.attempts.has(key)) {
      this.attempts.set(key, { successes: 0, failures: 0, lastAttempt: Date.now() });
    }
    
    const record = this.attempts.get(key);
    if (success) {
      record.successes++;
    } else {
      record.failures++;
    }
    record.lastAttempt = Date.now();
    
    // Log suspicious activity
    if (record.failures > 5) {
      console.warn('🚨 High OAuth failure rate:', { ip, userAgent, record });
    }
    
    // Clean up old records (older than 24 hours)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    for (const [k, v] of this.attempts.entries()) {
      if (v.lastAttempt < cutoff) {
        this.attempts.delete(k);
      }
    }
  },
  
  isRateLimited(ip, userAgent) {
    const key = `${ip}:${userAgent}`;
    const record = this.attempts.get(key);
    if (!record) return false;
    
    // Rate limit if more than 10 failures in last hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return record.failures > 10 && record.lastAttempt > oneHourAgo;
  }
};

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.cookies['auth_token'];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Generate a secure random string for email verification
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Local Sign Up
router.post('/signup', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    await client.query('BEGIN');

    // Check if email exists
    const existingUser = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user - Note we store minimal information
    const result = await client.query(
      `INSERT INTO users (
        email,
        password_hash,
        verification_token,
        account_status
      ) VALUES ($1, $2, $3, 'unverified') 
      RETURNING id, email`,
      [email, hashedPassword, verificationToken]
    );

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Account created. Please check your email to verify your account.',
      email: result.rows[0].email
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  } finally {
    client.release();
  }
});

// Email Verification
router.get('/verify/:token', async (req, res) => {
  const client = await pool.connect();
  try {
    const { token } = req.params;

    const result = await client.query(
      `UPDATE users 
       SET account_status = 'active',
           email_verified_at = CURRENT_TIMESTAMP,
           verification_token = NULL
       WHERE verification_token = $1
       RETURNING email`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  } finally {
    client.release();
  }
});

// Regular email/password login
router.post('/login', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;

    const result = await client.query(
      'SELECT id, email, password_hash, account_status FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.account_status === 'unverified') {
      return res.status(401).json({ error: 'Please verify your email first' });
    }

    // Log successful login
    await client.query(
      `INSERT INTO login_history (user_id, auth_method, success, ip_address)
       VALUES ($1, 'password', true, $2)`,
      [user.id, req.ip]
    );

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store session
    await client.query(
      `INSERT INTO active_sessions (user_id, token, created_at, expires_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '24 hours')`,
      [user.id, sessionToken]
    );

    res.json({
      sessionToken,
      email: user.email
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    client.release();
  }
});

// Handle Google OAuth login/signup
router.post('/google', async (req, res) => {
  console.log('POST /api/auth/google called');
  const client = await pool.connect();
  try {
    const { credential: accessToken } = req.body;
    
    // Set CORS headers explicitly for this route
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-frontend-woan.onrender.com'
      : 'http://localhost:3000'
    );

    if (!accessToken) {
      return res.status(400).json({ error: 'No access token provided' });
    }

    // Get user info from Google's userinfo endpoint
    console.log('Fetching user info from Google...');
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    console.log('Google userinfo response status:', userInfoResponse.status);

    if (!userInfoResponse.ok) {
      console.error('Google API error:', {
        status: userInfoResponse.status,
        statusText: userInfoResponse.statusText
      });
      return res.status(401).json({ error: 'Failed to get user info from Google' });
    }

    let userData;
    try {
      userData = await userInfoResponse.json();
      console.log('Google user data:', userData);
    } catch (error) {
      console.error('Failed to parse Google response:', error);
      return res.status(500).json({ error: 'Failed to parse Google response' });
    }

    if (!userData.email) {
      console.log('No email provided by Google');
      return res.status(400).json({ error: 'No email provided by Google' });
    }

    await client.query('BEGIN');

    // Check if user exists by OAuth ID first, then by email
    let result = await client.query(
      'SELECT * FROM users WHERE oauth_sub_id = $1 OR email = $2',
      [userData.id, userData.email]
    );
    console.log('User lookup result:', result.rows);

    let user;
    if (result.rows.length === 0) {
      console.log('Creating new user with email:', userData.email);
      // Auto-create new user
      result = await client.query(
        `INSERT INTO users (
          email,
          oauth_sub_id,
          oauth_provider,
          email_verified,
          created_at,
          name,
          last_login
        ) VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, $4, CURRENT_TIMESTAMP) 
        RETURNING *`,
        [userData.email, userData.id, 'google', userData.name]
      );
      user = result.rows[0];
      // Create default preferences
      await client.query(
        `INSERT INTO user_preferences (
          user_id,
          created_at,
          updated_at
        ) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [user.id]
      );
      console.log('Created new user:', { id: user.id, email: user.email, oauth_sub_id: user.oauth_sub_id });
    } else {
      user = result.rows[0];
      // Update existing user if needed
      if (!user.oauth_sub_id) {
        await client.query(
          `UPDATE users 
           SET oauth_sub_id = $1,
               oauth_provider = $2,
               name = $3,
               last_login = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [userData.id, 'google', userData.name, user.id]
        );
        user.oauth_sub_id = userData.id;
        user.oauth_provider = 'google';
        user.name = userData.name;
      } else {
        // Update user info and login time
        await client.query(
          `UPDATE users 
           SET last_login = CURRENT_TIMESTAMP,
               name = $2
           WHERE id = $1`,
          [user.id, userData.name]
        );
        user.name = userData.name;
      }
      console.log('Updated existing user:', { id: user.id, email: user.email, name: user.name, oauth_sub_id: user.oauth_sub_id });
    }

    // Log the login attempt
    await client.query(
      `INSERT INTO login_history (
        user_id,
        success,
        ip_address,
        oauth_sub_id,
        created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [user.id, true, req.ip, userData.id]
    );

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    console.log('Generated session token for user:', { id: user.id, email: user.email, oauth_sub_id: user.oauth_sub_id });
    // Store session
    await client.query(
      `INSERT INTO sessions (
        user_id,
        token,
        created_at,
        expires_at
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '24 hours')`,
      [user.id, sessionToken]
    );

    await client.query('COMMIT');

    // Set secure cookie with session token
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return user data
    console.log('Sending response to client:', { 
      ...userData,
      id: user.id,
      sessionToken 
    });
    
    res.json({
      ...userData,
      id: user.id,
      sessionToken
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Authentication error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Authentication failed', details: error.message });
    }
  } finally {
    client.release();
  }
});

// Verify session
router.get('/verify-session', async (req, res) => {
  const sessionToken = req.cookies.session_token;
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token' });
  }

  const client = await pool.connect();
  try {
    // Get valid session
    const result = await client.query(
      `SELECT s.*, u.email 
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 
       AND s.expires_at > CURRENT_TIMESTAMP`,
      [sessionToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    res.json({
      email: result.rows[0].email
    });

  } catch (error) {
    console.error('Session verification error:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  } finally {
    client.release();
  }
});

// Logout
router.post('/logout', async (req, res) => {
  const sessionToken = req.cookies.session_token;
  
  if (sessionToken) {
    const client = await pool.connect();
    try {
      await client.query(
        'DELETE FROM sessions WHERE token = $1',
        [sessionToken]
      );
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      client.release();
    }
  }

  res.clearCookie('session_token');
  res.json({ message: 'Logged out successfully' });
});

// User deletion endpoint (GDPR compliance)
router.delete('/account', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Anonymize user data
    await client.query(
      `UPDATE users 
       SET email = 'deleted_' || internal_id || '@deleted',
           name = 'Deleted User',
           avatar_url = NULL,
           account_status = 'deleted',
           deleted_at = CURRENT_TIMESTAMP
       WHERE internal_id = $1`,
      [req.user.userId]
    );

    // Log deletion
    await client.query(
      `INSERT INTO user_deletion_logs (
        user_id,
        reason,
        requested_at,
        ip_address
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`,
      [req.user.userId, req.body.reason || 'user_requested', req.ip]
    );

    await client.query('COMMIT');
    res.clearCookie('auth_token');
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  } finally {
    client.release();
  }
});

// User data export (GDPR compliance)
router.get('/export-data', verifyToken, async (req, res) => {
  try {
    const userData = await getUserDataExport(req.user.userId);
    res.json(userData);
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// Endpoint to check users (for debugging)
router.get('/check-users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error('Error checking users:', error);
    res.status(500).json({ error: 'Failed to check users' });
  }
});

// Handle session creation for Google OAuth users
router.post('/session', async (req, res) => {
  const client = await pool.connect();
  try {
    const { oauth_sub_id, email } = req.body;
    
    if (!oauth_sub_id || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await client.query('BEGIN');

    // Check if user exists
    let result = await client.query(
      'SELECT * FROM users WHERE oauth_sub_id = $1 OR email = $2',
      [oauth_sub_id, email]
    );

    let user;
    if (result.rows.length === 0) {
      // Create new user with minimal info
      result = await client.query(
        `INSERT INTO users (
          email,
          oauth_sub_id,
          oauth_provider,
          email_verified,
          created_at,
          last_login
        ) VALUES ($1, $2, 'google', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
        RETURNING id`,
        [email, oauth_sub_id]
      );
      user = result.rows[0];
    } else {
      user = result.rows[0];
      // Update last login
      await client.query(
        `UPDATE users 
         SET last_login = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [user.id]
      );
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store session
    await client.query(
      `INSERT INTO sessions (
        user_id,
        token,
        created_at,
        expires_at
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '24 hours')`,
      [user.id, sessionToken]
    );

    await client.query('COMMIT');

    // Return only the session token
    res.json({ sessionToken });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  } finally {
    client.release();
  }
});

function authenticateToken(req, res, next) {
  // Accept token from cookie OR header
  const sessionToken = req.cookies.session_token || req.headers['x-session-token'];
  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token' });
  }
  // TODO: Lookup user by sessionToken in your DB/session store
  req.user = { id: 1 }; // Dummy user for now, replace with real lookup
  console.log('Authenticated user in the auth.js file:', req.user);
  next();
}

router.get('/', (req, res) => {
  console.log('Pantry route HIT!');
  res.json({ test: 'ok' });
});

// Add API key validation endpoint
router.post('/', async (req, res) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    // Generate a session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store the session with the API key
    const sessions = req.app.get('sessions');
    sessions.set(sessionToken, {
      apiKey,
      createdAt: Date.now()
    });

    res.json({ sessionToken });
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({ error: 'Failed to validate API key' });
  }
});

// Handle Facebook OAuth login/signup
router.post('/facebook', async (req, res) => {
  console.log('POST /api/auth/facebook called');
  const client = await pool.connect();
  try {
    const { access_token } = req.body;
    
    // Set CORS headers
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-frontend-woan.onrender.com'
      : 'http://localhost:3000'
    );

    if (!access_token) {
      return res.status(400).json({ error: 'No access token provided' });
    }

    // Validate the access token with Facebook using proper error handling
    const appAccessToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
    const validateTokenUrl = `https://graph.facebook.com/debug_token?input_token=${access_token}&access_token=${appAccessToken}`;
    
    console.log('Validating Facebook token...');
    const validateResponse = await fetch(validateTokenUrl);
    
    if (!validateResponse.ok) {
      console.error('Facebook token validation failed:', {
        status: validateResponse.status,
        statusText: validateResponse.statusText
      });
      return res.status(401).json({ error: 'Invalid Facebook token' });
    }

    const validateData = await validateResponse.json();
    console.log('Token validation response:', validateData);

    // Proper validation of the response structure
    if (!validateData || !validateData.data || !validateData.data.is_valid) {
      console.error('Invalid token validation response:', validateData);
      return res.status(401).json({ 
        error: 'Invalid token validation response',
        details: validateData?.error?.message || 'Unknown error'
      });
    }

    // Verify app ID matches
    if (validateData.data.app_id !== process.env.FACEBOOK_APP_ID) {
      console.error('App ID mismatch:', {
        expected: process.env.FACEBOOK_APP_ID,
        received: validateData.data.app_id
      });
      return res.status(401).json({ error: 'Invalid application' });
    }

    // Get user info from Facebook's Graph API with validated token
    console.log('Fetching user info from Facebook...');
    const userInfoResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,email,name,picture.type(large)&access_token=${access_token}`
    );

    if (!userInfoResponse.ok) {
      console.error('Facebook Graph API error:', {
        status: userInfoResponse.status,
        statusText: userInfoResponse.statusText
      });
      return res.status(401).json({ 
        error: 'Failed to get user info from Facebook',
        details: `HTTP ${userInfoResponse.status}: ${userInfoResponse.statusText}`
      });
    }

    const userData = await userInfoResponse.json();
    if (!userData || !userData.id) {
      console.error('Invalid user data response:', userData);
      return res.status(401).json({ error: 'Invalid user data received' });
    }

    // Extract picture URL safely with fallback
    const pictureUrl = userData.picture?.data?.url || null;
    console.log('Facebook user data received:', { 
      id: userData.id,
      email: userData.email || 'not provided',
      name: userData.name,
      hasPicture: !!pictureUrl 
    });

    if (!userData.email) {
      console.log('No email provided by Facebook');
      return res.status(400).json({ error: 'Email permission not granted' });
    }

    await client.query('BEGIN');

    // Check if user exists with improved error handling
    let result = await client.query(
      'SELECT * FROM users WHERE oauth_sub_id = $1 OR email = $2',
      [userData.id, userData.email]
    );
    console.log('User lookup result:', { 
      found: result.rows.length > 0,
      matchType: result.rows[0] ? 
        (result.rows[0].oauth_sub_id === userData.id ? 'oauth_id' : 'email') : 
        'new_user'
    });

    let user;
    if (result.rows.length === 0) {
      // Create new user with enhanced security and validation
      console.log('Creating new user with email:', userData.email);
      result = await client.query(
        `INSERT INTO users (
          email,
          oauth_sub_id,
          oauth_provider,
          email_verified,
          created_at,
          name,
          avatar_url,
          last_login,
          oauth_token_hash
        ) VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, $4, $5, CURRENT_TIMESTAMP, $6) 
        RETURNING *`,
        [
          userData.email,
          userData.id,
          'facebook',
          userData.name,
          pictureUrl,
          crypto.createHash('sha256').update(access_token).digest('hex')
        ]
      );
      user = result.rows[0];

      // Create default preferences
      await client.query(
        `INSERT INTO user_preferences (
          user_id,
          created_at,
          updated_at
        ) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [user.id]
      );

      console.log('Created new Facebook user:', {
        id: user.id,
        email: user.email,
        oauth_sub_id: user.oauth_sub_id
      });
    } else {
      user = result.rows[0];
      // Update existing user with enhanced security
      const updates = [
        'last_login = CURRENT_TIMESTAMP',
        'name = $1',
        'oauth_token_hash = $2'
      ];
      
      if (!user.oauth_sub_id) {
        updates.push('oauth_sub_id = $3', 'oauth_provider = $4');
      }

      const updateQuery = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $5
        RETURNING *
      `;

      const updateParams = [
        userData.name,
        crypto.createHash('sha256').update(access_token).digest('hex'),
        userData.id,
        'facebook',
        user.id
      ];

      const updateResult = await client.query(updateQuery, updateParams);
      user = updateResult.rows[0];

      console.log('Updated existing user:', {
        id: user.id,
        email: user.email,
        oauth_sub_id: user.oauth_sub_id
      });
    }

    // Log the login attempt with enhanced security info
    await client.query(
      `INSERT INTO login_history (
        user_id,
        success,
        ip_address,
        oauth_sub_id,
        created_at,
        user_agent,
        oauth_provider
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)`,
      [user.id, true, req.ip, userData.id, req.get('User-Agent'), 'facebook']
    );

    // Generate secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store session with enhanced security
    await client.query(
      `INSERT INTO sessions (
        user_id,
        token,
        created_at,
        expires_at,
        oauth_provider,
        last_used_ip,
        user_agent
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '24 hours', $3, $4, $5)`,
      [user.id, sessionToken, 'facebook', req.ip, req.get('User-Agent')]
    );

    await client.query('COMMIT');

    // Set secure cookie with enhanced security options
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: true, // Always use secure in production
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
      domain: process.env.NODE_ENV === 'production' 
        ? '.onrender.com'  // Adjust this to match your domain
        : 'localhost'
    });

    // Return sanitized user data
    const sanitizedUserData = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      sessionToken
    };

    res.json(sanitizedUserData);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Facebook authentication error:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Authentication failed', 
        details: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message 
      });
    }
  } finally {
    client.release();
  }
});

// Handle Apple Sign-in login/signup
router.post('/apple', async (req, res) => {
  console.log('POST /api/auth/apple called');
  const client = await pool.connect();
  try {
    const { code, id_token } = req.body;
    
    // Set CORS headers
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-frontend-woan.onrender.com'
      : 'http://localhost:3000'
    );

    if (!code || !id_token) {
      return res.status(400).json({ error: 'Missing required authentication data' });
    }

    // Verify the id_token and extract user info
    // Note: You'll need to implement proper JWT verification for the id_token
    const decodedToken = jwt.decode(id_token);
    if (!decodedToken) {
      return res.status(401).json({ error: 'Invalid ID token' });
    }

    const userData = {
      id: decodedToken.sub,
      email: decodedToken.email,
      name: decodedToken.name || 'Apple User' // Apple might not provide name
    };

    await client.query('BEGIN');

    // Check if user exists
    let result = await client.query(
      'SELECT * FROM users WHERE oauth_sub_id = $1 OR email = $2',
      [userData.id, userData.email]
    );

    let user;
    if (result.rows.length === 0) {
      // Create new user
      result = await client.query(
        `INSERT INTO users (
          email,
          oauth_sub_id,
          oauth_provider,
          email_verified,
          created_at,
          name,
          last_login
        ) VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, $4, CURRENT_TIMESTAMP) 
        RETURNING *`,
        [userData.email, userData.id, 'apple', userData.name]
      );
      user = result.rows[0];
      // Create default preferences
      await client.query(
        `INSERT INTO user_preferences (
          user_id,
          created_at,
          updated_at
        ) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [user.id]
      );
    } else {
      user = result.rows[0];
      // Update existing user if needed
      if (!user.oauth_sub_id) {
        await client.query(
          `UPDATE users 
           SET oauth_sub_id = $1,
               oauth_provider = $2,
               name = $3,
               last_login = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [userData.id, 'apple', userData.name, user.id]
        );
      } else {
        await client.query(
          `UPDATE users 
           SET last_login = CURRENT_TIMESTAMP,
               name = $2
           WHERE id = $1`,
          [user.id, userData.name]
        );
      }
    }

    // Log the login attempt
    await client.query(
      `INSERT INTO login_history (
        user_id,
        success,
        ip_address,
        oauth_sub_id,
        created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [user.id, true, req.ip, userData.id]
    );

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store session
    await client.query(
      `INSERT INTO sessions (
        user_id,
        token,
        created_at,
        expires_at
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '24 hours')`,
      [user.id, sessionToken]
    );

    await client.query('COMMIT');

    // Set secure cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      ...userData,
      id: user.id,
      sessionToken
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Apple authentication error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Authentication failed', details: error.message });
    }
  } finally {
    client.release();
  }
});

// Handle X (Twitter) OAuth login/signup
router.post('/x', async (req, res) => {
  console.log('POST /api/auth/x called');
  try {
    // Set CORS headers
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-frontend-woan.onrender.com'
      : 'http://localhost:3000'
    );

    // Ensure session is initialized
    if (!req.session) {
      console.error('No session found');
      return res.status(500).json({ error: 'Session not initialized' });
    }

    // Generate auth URL using OAuth 2.0
    const { url, state, codeVerifier } = await twitterClient.generateOAuth2AuthLink(
      process.env.NODE_ENV === 'production'
        ? 'https://meal-planner-app-3m20.onrender.com/api/auth/x/callback'
        : 'http://localhost:3001/api/auth/x/callback',
      { 
        scope: ['users.read', 'tweet.read', 'tweet.write', 'users.email','offline.access']
      }
    );

    // Store state and codeVerifier in session
    req.session.xState = state;
    req.session.codeVerifier = codeVerifier;
    
    // Save session explicitly
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Failed to save session:', err);
          reject(err);
        } else {
          console.log('Session saved successfully:', {
            state: req.session.xState ? 'present' : 'missing',
            codeVerifier: req.session.codeVerifier ? 'present' : 'missing'
          });
          resolve();
        }
      });
    });

    res.json({ url });

  } catch (error) {
    console.error('X authentication error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

// Debug logging for route registration
console.log('Registering X auth routes...');

// Additional security middleware for OAuth
const oauthSecurityMiddleware = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  const ip = req.ip;
  
  // Check for suspicious request patterns
  if (!userAgent || userAgent.length < 10) {
    oauthMonitor.logAttempt(ip, userAgent, false);
    return res.status(400).json({ error: 'Invalid request' });
  }
  
  // Check if rate limited
  if (oauthMonitor.isRateLimited(ip, userAgent)) {
    oauthMonitor.logAttempt(ip, userAgent, false);
    return res.status(429).json({ error: 'Too many failed attempts. Please try again later.' });
  }
  
  // Basic bot detection
  const suspiciousPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    console.warn('⚠️ Suspicious OAuth request from:', { ip, userAgent });
  }
  
  next();
};

// X (Twitter) OAuth routes
router.get('/x/authorize', oauthLimiter, oauthSecurityMiddleware, async (req, res) => {
  try {
    const flow = req.query.flow || 'redirect';   // 👈 SUPPORT popup OR redirect

    const backendOrigin = process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-app-3m20.onrender.com'
      : 'http://localhost:3001';

    const { url, state, codeVerifier } = await twitterClient.generateOAuth2AuthLink(
      `${backendOrigin}/api/auth/x/callback`,
      {
        scope: ['tweet.read', 'users.read','tweet.write', 'offline.access', 'users.email']
      }
    );

    // Store state with flow info
    await oauthStateManager.store(state, {
      codeVerifier,
      flow,                          // 👈 store flow type
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: Date.now()
    }, 10); // 10-minute TTL

    console.log('✅ OAuth state stored:', { state, flow });

    // Log successful authorization
    oauthMonitor.logAttempt(req.ip, req.get('User-Agent'), true);

    res.json({ url });
  } catch (error) {
    console.error('❌ Error generating auth URL:', error);
    oauthMonitor.logAttempt(req.ip, req.get('User-Agent'), false);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// X (Twitter) OAuth callback
router.get('/x/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    console.log('🔔 Callback received:', { code, state });

    const frontendOrigin = process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-frontend-woan.onrender.com'
      : 'http://localhost:3000';

    const backendOrigin = process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-app-3m20.onrender.com'
      : 'http://localhost:3001';

    // 1️⃣ Retrieve stored OAuth state
    const storedData = await oauthStateManager.get(state);
    if (!storedData) {
      console.error('❌ No stored OAuth state found for:', state);
      oauthMonitor.logAttempt(req.ip, req.get('User-Agent'), false);
      return res.redirect(`${backendOrigin}/auth/error?error=invalid_or_expired_state`);
    }

    const { codeVerifier, flow } = storedData;
    console.log('✅ State verified with flow:', flow);

    // 2️⃣ Exchange code for tokens
    const exchangeClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET
    });

    const {
      accessToken,
      refreshToken,
      expiresIn,
      scope,
      id_token
    } = await exchangeClient.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: `${backendOrigin}/api/auth/x/callback`
    });

    console.log('✅ Token exchange successful');
    console.log('🔑 Access Token:', accessToken);
    console.log('🔄 Refresh Token:', refreshToken);
    console.log('⏳ Expires In:', expiresIn);
    console.log('✅ Scopes granted by Twitter:', scope);

    // 3️⃣ Decode email from id_token if present
    let email = null;
    if (id_token) {
      try {
        const decoded = jwt.decode(id_token);
        console.log('✅ Decoded ID Token:', decoded);
        if (decoded && decoded.email) {
          email = decoded.email;
          console.log('📧 Extracted Email:', email);
        }
      } catch (err) {
        console.warn('⚠️ Failed to decode ID token:', err);
      }
    }

    // 4️⃣ Fetch user info from Twitter API
    const loggedClient = new TwitterApi(accessToken);
    const userResponse = await loggedClient.v2.me();
    const user = userResponse.data;
    console.log('✅ Twitter User Info:', user);

    // 5️⃣ Combine user info with decoded email
    const userWithEmail = {
      ...user,
      email
    };

    // 6️⃣ Save session if available
    if (req.session) {
      req.session.xUser = userWithEmail;
      req.session.xAccessToken = accessToken;
      req.session.xRefreshToken = refreshToken;
      req.session.xTokenExpiry = Date.now() + (expiresIn * 1000);
    }

    // 7️⃣ Clear used OAuth state
    await oauthStateManager.delete(state);
    oauthMonitor.logAttempt(req.ip, req.get('User-Agent'), true);

    // 8️⃣ Return result to frontend based on flow
    if (flow === 'popup') {
      console.log('✅ Detected popup flow - returning postMessage');
      return res.send(`
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'X_AUTH_SUCCESS', user: ${JSON.stringify(userWithEmail)} }, '${frontendOrigin}');
            window.close();
          } else {
            window.location.href = '${frontendOrigin}?x_auth_success=true';
          }
        </script>
      `);
    }

    // 9️⃣ Redirect flow fallback
    console.log('✅ Detected redirect flow - redirecting');
    return res.redirect(`${frontendOrigin}/auth/success`);

  } catch (error) {
    console.error('❌ X callback error:', {
      message: error.message,
      code: error.code,
      data: error.data,
      stack: error.stack
    });

    oauthMonitor.logAttempt(req.ip, req.get('User-Agent'), false);

    const backendOrigin = process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-app-3m20.onrender.com'
      : 'http://localhost:3001';
    res.redirect(`${backendOrigin}/auth/error?error=` + encodeURIComponent(error.message));
  }
});



// Health check endpoint for OAuth system
router.get('/oauth/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    storeType: oauthStateManager.useRedis ? 'Redis' : 'Memory',
    storeSize: oauthStateManager.getStoreSize(),
    monitoringActive: true,
    rateLimitConfig: {
      windowMs: parseInt(process.env.OAUTH_RATE_LIMIT_WINDOW_MS) || (15 * 60 * 1000),
      max: parseInt(process.env.OAUTH_RATE_LIMIT_MAX) || 10
    }
  });
});

// X OAuth completion endpoint for redirect-based auth
router.post('/x/complete', async (req, res) => {
  try {
    const { oauth_token, oauth_verifier } = req.body;
    
    if (!oauth_token || !oauth_verifier) {
      return res.status(400).json({ error: 'Missing oauth_token or oauth_verifier' });
    }

    console.log('🔄 Completing X OAuth for redirect flow:', { oauth_token, oauth_verifier });

    // Use the Twitter client to complete the OAuth flow
    try {
      // For OAuth 1.0a (the old Twitter API), we would use different logic
      // But since we're using OAuth 2.0, we should have already handled this in the callback
      // This endpoint is more for handling any additional user data processing
      
      // In a real implementation, you might:
      // 1. Verify the tokens are valid
      // 2. Get user information from X
      // 3. Create or update user in your database
      // 4. Generate a session token
      
      // For now, we'll simulate a successful completion
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      // Store in sessions map
      const sessions = req.app.get('sessions');
      sessions.set(sessionToken, {
        apiKey: null, // User hasn't provided API key yet
        createdAt: Date.now(),
        provider: 'x',
        oauth_token,
        oauth_verifier
      });

      // Log successful OAuth completion
      oauthMonitor.logAttempt(req.ip, req.get('User-Agent'), true);

      res.json({
        success: true,
        sessionToken,
        provider: 'x',
        message: 'X OAuth completed successfully'
      });

    } catch (oauthError) {
      console.error('X OAuth completion error:', {
        error: oauthError.message,
        code: oauthError.code,
        data: oauthError.data
      });
      
      // Log failed OAuth completion
      oauthMonitor.logAttempt(req.ip, req.get('User-Agent'), false);
      
      res.status(400).json({ 
        error: 'OAuth completion failed', 
        details: oauthError.message 
      });
    }

  } catch (error) {
    console.error('X OAuth completion endpoint error:', error);
    
    // Log failed OAuth completion
    oauthMonitor.logAttempt(req.ip, req.get('User-Agent'), false);
    
    res.status(500).json({ 
      error: 'Internal server error during OAuth completion' 
    });
  }
});

// OAuth error handler route
router.get('/error', (req, res) => {
  const error = req.query.error || 'Unknown error';
  const frontendOrigin = process.env.NODE_ENV === 'production'
    ? 'https://meal-planner-frontend-woan.onrender.com'
    : 'http://localhost:3000';

  // Send HTML that will post message to parent and close popup
  res.send(`
    <script>
      const error = ${JSON.stringify(error)};
      if (window.opener) {
        window.opener.postMessage({ type: 'X_AUTH_ERROR', error }, '${frontendOrigin}');
        window.close();
      } else {
        // If no opener, redirect to frontend with error
        window.location.href = '${frontendOrigin}?x_auth_error=' + encodeURIComponent(error);
      }
    </script>
  `);
});

module.exports = router;
module.exports.authenticateToken = authenticateToken; 