const express = require('express');
const axios = require('axios');
const router = express.Router();
const crypto = require('crypto');
const moment = require('moment');
const fitbitClient = require('../services/fitbitClient');

/**
 * Generate a PKCE code verifier and challenge
 * PKCE (Proof Key for Code Exchange) enhances security for OAuth
 * - code_verifier: Random string that will be used to prove we're the same app when exchanging code
 * - code_challenge: SHA256 hash of verifier, sent with initial request
 * @returns {Object} Object containing code_verifier and code_challenge
 */
function generatePKCE() {
  // Generate a random code verifier (high-entropy cryptographic random string)
  const code_verifier = crypto.randomBytes(32).toString('base64url');
  
  // Create code challenge using SHA256 (required by Fitbit OAuth2)
  const code_challenge = crypto
    .createHash('sha256')
    .update(code_verifier)
    .digest('base64url');
  
  return { code_verifier, code_challenge };
}

/**
 * Safely fetch data from Fitbit API with error handling
 * @param {string} url - API endpoint URL
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} API response data or null if error
 */
async function safeFitbitFetch(url, headers) {
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetch all available data from Fitbit API based on granted scopes
 * @param {string} accessToken - Fitbit access token
 * @param {string} scope - Space-separated list of granted scopes
 * @returns {Promise<Object>} - All fetched Fitbit data
 */
async function fetchAllFitbitData(accessToken, scope) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`
  };
  
  // Get date ranges
  const today = moment().format('YYYY-MM-DD');
  const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
  const lastMonth = moment().subtract(1, 'month').format('YYYY-MM-DD');
  
  const data = {};
  const scopes = scope.split(' ');
  
  console.log('Fetching Fitbit data for scopes:', scope);

  // Profile data (always available)
  data.profile = await safeFitbitFetch(
    'https://api.fitbit.com/1/user/-/profile.json',
    headers
  );

  // Activity data
  if (scopes.includes('activity')) {
    const [activities, lifetime] = await Promise.all([
      safeFitbitFetch(
        `https://api.fitbit.com/1/user/-/activities/date/${today}.json`,
        headers
      ),
      safeFitbitFetch(
        'https://api.fitbit.com/1/user/-/activities.json',
        headers
      )
    ]);
    data.activities = { daily: activities, lifetime };
  }

  // Heart rate data
  if (scopes.includes('heartrate')) {
    data.heartRate = await safeFitbitFetch(
      `https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1day.json`,
      headers
    );
  }

  // Sleep data
  if (scopes.includes('sleep')) {
    data.sleep = await safeFitbitFetch(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${today}.json`,
      headers
    );
  }

  // Nutrition data
  if (scopes.includes('nutrition')) {
    const [foods, water] = await Promise.all([
      safeFitbitFetch(
        `https://api.fitbit.com/1/user/-/foods/log/date/${today}.json`,
        headers
      ),
      safeFitbitFetch(
        `https://api.fitbit.com/1/user/-/foods/log/water/date/${today}.json`,
        headers
      )
    ]);
    data.nutrition = { foods, water };
  }

  // Weight data
  if (scopes.includes('weight')) {
    data.weight = await safeFitbitFetch(
      `https://api.fitbit.com/1/user/-/body/log/weight/date/${lastMonth}/${today}.json`,
      headers
    );
  }

  // Oxygen saturation data
  if (scopes.includes('oxygen_saturation')) {
    data.oxygenSaturation = await safeFitbitFetch(
      `https://api.fitbit.com/1/user/-/spo2/date/${yesterday}/${today}.json`,
      headers
    );
  }

  // Temperature data
  if (scopes.includes('temperature')) {
    data.temperature = await safeFitbitFetch(
      `https://api.fitbit.com/1/user/-/temp/core/date/${yesterday}/${today}.json`,
      headers
    );
  }

  // Respiratory rate data
  if (scopes.includes('respiratory_rate')) {
    data.respiratoryRate = await safeFitbitFetch(
      `https://api.fitbit.com/1/user/-/br/date/${yesterday}/${today}.json`,
      headers
    );
  }

  // Cardio fitness data
  if (scopes.includes('cardio_fitness')) {
    data.cardioFitness = await safeFitbitFetch(
      `https://api.fitbit.com/1/user/-/cardio-fitness/date/${yesterday}/${today}.json`,
      headers
    );
  }

  // Log all collected data
  Object.entries(data).forEach(([key, value]) => {
    if (value) {
      console.log(`${key} data:`, JSON.stringify(value, null, 2));
    }
  });

  return data;
}

// OAuth authorization endpoint
router.get('/auth', async (req, res) => {
  try {
    // Generate PKCE code verifier and challenge
    const state = crypto.randomBytes(32).toString('hex');
    const code_verifier = crypto.randomBytes(32).toString('base64url');
    const code_challenge = crypto.createHash('sha256')
      .update(code_verifier)
      .digest('base64url');

    // Store OAuth state in session
    req.session.fitbitOauth = {
      state,
      code_verifier,
      timestamp: Date.now()
    };

    // Debug session before save
    console.log('Session before save:', {
      id: req.sessionID,
      oauth: req.session.fitbitOauth,
      cookie: req.session.cookie,
      hasSession: !!req.session
    });

    // Save session explicitly before redirect
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          console.error('Failed to save session:', err);
          reject(err);
        } else {
          // Debug session after save
          console.log('Session after save:', {
            id: req.sessionID,
            oauth: req.session.fitbitOauth,
            cookie: req.session.cookie,
            hasSession: !!req.session
          });
          console.log('Session saved successfully. Session ID:', req.sessionID);
          resolve();
        }
      });
    });

    // Build authorization URL
    const authUrl = new URL('https://www.fitbit.com/oauth2/authorize');
    authUrl.searchParams.append('client_id', process.env.FITBIT_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('code_challenge', code_challenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('redirect_uri', process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-app-3m20.onrender.com/api/fitbit/callback'
      : 'http://localhost:3001/api/fitbit/callback'
    );
    
    // Use correct Fitbit scope format with r/w prefixes
    const scopes = [
      'profile',     // Basic profile
      'activity',    // Activity data
      'heartrate',   // Heart rate data
      'location',    // Location data
      'nutrition',   // Nutrition data
      'settings',    // User settings
      'sleep',       // Sleep data
      'social',      // Social data
      'weight'       // Weight data
    ].map(scope => `r${scope}`); // Add 'r' prefix for read access

    // Special cases that need different prefixes
    scopes.push(
      'ract',      // Activity data
      'rcf',       // Cardio fitness
      'roxy',      // Oxygen saturation
      'rres',      // Respiratory rate
      'rtem',      // Temperature
      'rprof'      // Profile data
    );

    authUrl.searchParams.append('scope', scopes.join(' '));

    console.log('Initiating Fitbit OAuth with:', {
      clientId: process.env.FITBIT_CLIENT_ID,
      redirectUri: process.env.NODE_ENV === 'production'
        ? 'https://meal-planner-app-3m20.onrender.com/api/fitbit/callback'
        : 'http://localhost:3001/api/fitbit/callback',
      scopes: scopes,
      state: state.substring(0, 8) + '...',
      hasCodeChallenge: true,
      sessionID: req.sessionID
    });

    res.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Failed to initialize OAuth:', error);
    res.status(500).json({ error: 'Failed to initialize OAuth' });
  }
});

// OAuth callback endpoint
router.get('/callback', async (req, res) => {
  console.log('Callback received. Session debug:', {
    id: req.sessionID,
    hasSession: !!req.session,
    sessionData: req.session,
    cookies: req.cookies,
    headers: {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer
    }
  });

  try {
    const { code, state: queryState, error: queryError } = req.query;

    // Handle OAuth errors
    if (queryError) {
      console.error('Fitbit OAuth error from query:', queryError);
      return res.send(`
        <script>
          window.opener.postMessage(
            { type: 'fitbit_callback', error: '${queryError}' },
            '*'
          );
          window.close();
        </script>
      `);
    }

    // Validate state
    if (!queryState) {
      console.error('No state parameter in callback');
      return res.send(`
        <script>
          window.opener.postMessage(
            { type: 'fitbit_callback', error: 'Invalid OAuth state' },
            '*'
          );
          window.close();
        </script>
      `);
    }

    // Try to find OAuth state in session
    const oauthState = req.session.fitbitOauth;
    console.log('OAuth state from session:', oauthState);

    if (!oauthState || oauthState.state !== queryState) {
      console.error('OAuth state mismatch or missing:', {
        sessionState: oauthState?.state,
        queryState,
        sessionID: req.sessionID,
        hasSession: !!req.session,
        sessionKeys: req.session ? Object.keys(req.session) : [],
        cookies: req.cookies
      });
      
      return res.send(`
        <script>
          window.opener.postMessage(
            { type: 'fitbit_callback', error: 'No OAuth session found' },
            '*'
          );
          window.close();
        </script>
      `);
    }

    // Exchange code for token
    const tokenResponse = await fitbitClient.getAccessToken({
      code,
      code_verifier: oauthState.code_verifier,
      redirect_uri: process.env.NODE_ENV === 'production'
        ? 'https://meal-planner-app-3m20.onrender.com/api/fitbit/callback'
        : 'http://localhost:3001/api/fitbit/callback'
    });

    // Get user profile
    const profile = await fitbitClient.getProfile(tokenResponse.accessToken);

    // Get activities
    const activities = await fitbitClient.getActivities(tokenResponse.accessToken);

    // Store tokens in session
    req.session.fitbit = {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      expiresIn: tokenResponse.expiresIn,
      obtainedAt: new Date().toISOString()
    };

    // Clear OAuth state from session
    delete req.session.fitbitOauth;

    // Save session explicitly
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Send success response
    res.send(`
      <script>
        window.opener.postMessage({
          type: 'fitbit_callback',
          data: {
            profile: ${JSON.stringify(profile)},
            tokens: ${JSON.stringify({
              accessToken: tokenResponse.accessToken,
              refreshToken: tokenResponse.refreshToken,
              expiresIn: tokenResponse.expiresIn
            })},
            allData: ${JSON.stringify({ activities })}
          }
        }, '*');
        window.close();
      </script>
    `);

  } catch (error) {
    console.error('Fitbit OAuth error:', error);
    res.send(`
      <script>
        window.opener.postMessage({
          type: 'fitbit_callback',
          error: 'Failed to complete authentication'
        }, '*');
        window.close();
      </script>
    `);
  }
});

// Get current user's Fitbit profile
router.get('/profile', async (req, res) => {
  try {
    // Check if user is authenticated with Fitbit
    if (!req.session.fitbit?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated with Fitbit' });
    }

    const accessToken = req.session.fitbit.accessToken;

    // Get user's Fitbit profile
    const profile = await fitbitClient.getProfile(accessToken);

    // Return relevant profile data
    res.json({ profile });

  } catch (error) {
    console.error('Error fetching Fitbit profile:', error);
    
    // Check if token expired
    if (error.response?.status === 401) {
      // Clear invalid session
      delete req.session.fitbit;
      return res.status(401).json({ error: 'Fitbit session expired' });
    }

    res.status(500).json({ 
      error: 'Failed to fetch Fitbit profile',
      details: error.message
    });
  }
});

// Store Fitbit tokens in session
router.post('/store-tokens', async (req, res) => {
  try {
    const { accessToken, refreshToken, expiresIn } = req.body;
    
    if (!accessToken || !refreshToken || !expiresIn) {
      return res.status(400).json({ error: 'Missing required token data' });
    }

    // Store tokens in session
    req.session.fitbit = {
      accessToken,
      refreshToken,
      expiresIn,
      obtainedAt: new Date().toISOString()
    };

    // Save session explicitly
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Error storing Fitbit tokens:', error);
    res.status(500).json({ error: 'Failed to store Fitbit tokens' });
  }
});

module.exports = router; 