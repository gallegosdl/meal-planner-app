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

    // Validate the access token with Facebook
    const validateTokenUrl = `https://graph.facebook.com/debug_token?input_token=${access_token}&access_token=${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
    const validateResponse = await fetch(validateTokenUrl);
    const validateData = await validateResponse.json();

    if (!validateData.data.is_valid) {
      console.error('Invalid Facebook token:', validateData);
      return res.status(401).json({ error: 'Invalid Facebook token' });
    }

    // Get user info from Facebook's Graph API with validated token
    console.log('Fetching user info from Facebook...');
    const userInfoResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,email,name,picture.type(large)&access_token=${access_token}`
    );
    console.log('Facebook userinfo response status:', userInfoResponse.status);

    if (!userInfoResponse.ok) {
      console.error('Facebook API error:', {
        status: userInfoResponse.status,
        statusText: userInfoResponse.statusText
      });
      return res.status(401).json({ error: 'Failed to get user info from Facebook' });
    }

    const userData = await userInfoResponse.json();
    // Extract picture URL safely
    const pictureUrl = userData.picture?.data?.url || null;
    console.log('Facebook user data:', { ...userData, pictureUrl });

    if (!userData.email) {
      console.log('No email provided by Facebook');
      return res.status(400).json({ error: 'No email provided by Facebook' });
    }

    await client.query('BEGIN');

    // Check if user exists
    let result = await client.query(
      'SELECT * FROM users WHERE oauth_sub_id = $1 OR email = $2',
      [userData.id, userData.email]
    );
    console.log('User lookup result:', result.rows);

    let user;
    if (result.rows.length === 0) {
      console.log('Creating new user with email:', userData.email);
      // Create new user with basic info first
      result = await client.query(
        `INSERT INTO users (
          email,
          oauth_sub_id,
          oauth_provider,
          email_verified,
          created_at,
          name,
          avatar_url,
          last_login
        ) VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, $4, $5, CURRENT_TIMESTAMP) 
        RETURNING *`,
        [
          userData.email,
          userData.id,
          'facebook',
          userData.name,
          pictureUrl
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

      // Log new user creation
      console.log('Created new Facebook user:', {
        id: user.id,
        email: user.email,
        name: user.name,
        oauth_sub_id: user.oauth_sub_id
      });
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
          [userData.id, 'facebook', userData.name, user.id]
        );
        user.oauth_sub_id = userData.id;
        user.oauth_provider = 'facebook';
        user.name = userData.name;
      } else {
        await client.query(
          `UPDATE users 
           SET last_login = CURRENT_TIMESTAMP,
               name = $2
           WHERE id = $1`,
          [user.id, userData.name]
        );
      }
      console.log('Updated existing user:', {
        id: user.id,
        email: user.email,
        name: user.name,
        oauth_sub_id: user.oauth_sub_id
      });
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
    console.error('Facebook authentication error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Authentication failed', details: error.message });
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
        ? 'https://meal-planner-frontend-woan.onrender.com/api/auth/x/callback'
        : 'http://localhost:3000/api/auth/x/callback',
      { 
        scope: ['users.read', 'tweet.read', 'tweet.write', 'offline.access']
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

// Test route to verify callback endpoint is accessible
router.get('/x/test', (req, res) => {
  console.log('Test route hit');
  res.send('Test route working');
});

// Handle X (Twitter) OAuth callback
router.get('/x/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    console.log('Callback received:', { 
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing',
      session: req.session ? {
        xState: req.session.xState ? 'present' : 'missing',
        codeVerifier: req.session.codeVerifier ? 'present' : 'missing'
      } : 'no session',
      headers: req.headers
    });

    // Verify state matches what we stored in session
    if (!req.session || !req.session.xState) {
      console.error('No session or state:', {
        session: !!req.session,
        sessionId: req.sessionID,
        cookies: req.headers.cookie
      });
      return res.redirect('http://localhost:3000/auth/error?error=session_lost');
    }

    if (req.session.xState !== state) {
      console.error('State mismatch:', { 
        sessionState: req.session.xState,
        receivedState: state
      });
      return res.redirect('http://localhost:3000/auth/error?error=invalid_state');
    }

    if (!req.session.codeVerifier) {
      console.error('No code verifier in session');
      return res.redirect('http://localhost:3000/auth/error?error=missing_code_verifier');
    }

    console.log('State verified, exchanging code for token...');

    try {
      // Use the global twitterClient instance
      const { accessToken, refreshToken, expiresIn } = await twitterClient.loginWithOAuth2({
        code,
        codeVerifier: req.session.codeVerifier,
        redirectUri: 'http://localhost:3001/api/auth/x/callback'
      });

      console.log('Token exchange successful');

      // Store tokens in session
      req.session.xAccessToken = accessToken;
      req.session.xRefreshToken = refreshToken;
      req.session.xTokenExpiry = Date.now() + (expiresIn * 1000);

      // Get user info using the same client instance
      const loggedClient = new TwitterApi(accessToken);
      const user = await loggedClient.v2.me();

      console.log('User info retrieved:', { 
        id: user.data.id,
        username: user.data.username
      });

      // Store user info in session
      req.session.xUser = user.data;
      
      // Save session before clearing OAuth state
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Failed to save session:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Clear OAuth state
      delete req.session.xState;
      delete req.session.codeVerifier;

      // Close popup and notify parent window
      res.send(`
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'X_AUTH_SUCCESS', user: ${JSON.stringify(user.data)} }, 'http://localhost:3000');
            window.close();
          }
        </script>
      `);

    } catch (tokenError) {
      console.error('Token exchange error:', {
        error: tokenError.message,
        code: tokenError.code,
        data: tokenError.data,
        stack: tokenError.stack
      });
      throw tokenError;
    }

  } catch (error) {
    console.error('X callback error:', {
      message: error.message,
      code: error.code,
      data: error.data,
      stack: error.stack
    });
    res.redirect('http://localhost:3000/auth/error?error=' + encodeURIComponent(error.message));
  }
});

// Debug logging for route registration
console.log('Registering X auth routes...');

// X (Twitter) OAuth routes
router.get('/x/authorize', async (req, res) => {
  try {
    // If there's an existing auth attempt, clear it
    delete req.session.codeVerifier;
    delete req.session.xState;

    // Always generate new verifier + challenge pair
    const { url, state, codeVerifier } = await twitterClient.generateOAuth2AuthLink(
      'http://localhost:3001/api/auth/x/callback',
      {
        scope: ['tweet.read', 'users.read', 'offline.access']
      }
    );

    // Store the verifier and state in session
    req.session.codeVerifier = codeVerifier;
    req.session.xState = state;

    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Failed to save session:', err);
          return reject(err);
        }
        console.log('Session saved with PKCE values:', {
          state,
          codeVerifier
        });
        resolve();
      });
    });

    console.log('Auth URL generated with:', {
      state,
      url
    });

    res.json({ url });

  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// X (Twitter) OAuth callback
router.get('/x/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    console.log('Callback received:', { 
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing',
      session: req.session ? {
        xState: req.session.xState ? 'present' : 'missing',
        codeVerifier: req.session.codeVerifier ? 'present' : 'missing',
        actualState: req.session.xState,
        actualVerifier: req.session.codeVerifier
      } : 'no session',
      headers: req.headers
    });

    // Verify state matches what we stored in session
    if (!req.session || !req.session.xState) {
      console.error('No session or state:', {
        session: !!req.session,
        sessionId: req.sessionID,
        cookies: req.headers.cookie
      });
      return res.redirect('http://localhost:3000/auth/error?error=session_lost');
    }

    if (req.session.xState !== state) {
      console.error('State mismatch:', { 
        sessionState: req.session.xState,
        receivedState: state
      });
      return res.redirect('http://localhost:3000/auth/error?error=invalid_state');
    }

    if (!req.session.codeVerifier) {
      console.error('No code verifier in session');
      return res.redirect('http://localhost:3000/auth/error?error=missing_code_verifier');
    }

    console.log('State verified, exchanging code for token with verifier:', req.session.codeVerifier);

    try {
      // Use the global twitterClient instance
      const { accessToken, refreshToken, expiresIn } = await twitterClient.loginWithOAuth2({
        code,
        codeVerifier: req.session.codeVerifier,
        redirectUri: 'http://localhost:3001/api/auth/x/callback'
      });

      console.log('Token exchange successful');

      // Store tokens in session
      req.session.xAccessToken = accessToken;
      req.session.xRefreshToken = refreshToken;
      req.session.xTokenExpiry = Date.now() + (expiresIn * 1000);

      // Get user info using the same client instance
      const loggedClient = new TwitterApi(accessToken);
      const user = await loggedClient.v2.me();

      console.log('User info retrieved:', { 
        id: user.data.id,
        username: user.data.username
      });

      // Store user info in session
      req.session.xUser = user.data;
      
      // Save session before clearing OAuth state
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Failed to save session:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Clear OAuth state
      delete req.session.xState;
      delete req.session.codeVerifier;

      // Close popup and notify parent window
      res.send(`
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'X_AUTH_SUCCESS', user: ${JSON.stringify(user.data)} }, 'http://localhost:3000');
            window.close();
          }
        </script>
      `);

    } catch (tokenError) {
      console.error('Token exchange error:', {
        error: tokenError.message,
        code: tokenError.code,
        data: tokenError.data,
        stack: tokenError.stack
      });
      throw tokenError;
    }

  } catch (error) {
    console.error('X callback error:', {
      message: error.message,
      code: error.code,
      data: error.data,
      stack: error.stack
    });
    res.redirect('http://localhost:3000/auth/error?error=' + encodeURIComponent(error.message));
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken; 