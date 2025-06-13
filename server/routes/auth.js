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

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
    console.log('Request body:', req.body);
    
    if (!accessToken) {
      console.log('Missing access token in request');
      return res.status(400).json({ error: 'Missing access token' });
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
        ) VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
        RETURNING *`,
        [userData.email, userData.id, 'google']
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
      id: user.id, 
      email: userData.email,
      name: userData.name,
      oauth_sub_id: userData.id,
      sessionToken 
    });
    
    res.json({
      id: user.id,
      email: userData.email,
      name: userData.name,
      oauth_sub_id: userData.id,
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

module.exports = router; 