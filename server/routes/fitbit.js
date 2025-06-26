const express = require('express');
const axios = require('axios');
const router = express.Router();
const crypto = require('crypto');
const moment = require('moment');

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

// Endpoint to initiate Fitbit OAuth
router.get('/auth', async (req, res) => {
  try {
    const clientId = process.env.FITBIT_CLIENT_ID;
    const redirectUri = process.env.FITBIT_REDIRECT_URI || (process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-app-3m20.onrender.com/api/fitbit/callback'
      : 'http://localhost:3001/api/fitbit/callback');
    
    // All available Fitbit scopes as of 2024
    const scopes = [
      'activity',          // Activity data (steps, distance, calories, active minutes)
      'cardio_fitness',    // Cardio fitness score (VO2 Max)
      'electrocardiogram', // ECG readings from Fitbit devices
      'heartrate',         // Heart rate data
      'irregular_rhythm_notifications', // AFib notifications
      'location',          // GPS and location data
      'nutrition',         // Food logging and nutrition data
      'oxygen_saturation', // Blood oxygen saturation data
      'profile',          // Basic profile information
      'respiratory_rate',  // Breathing rate data
      'settings',         // Device and app settings
      'sleep',            // Sleep tracking data
      'social',           // Social features (friends, sharing)
      'temperature',      // Body temperature data
      'weight'            // Weight, BMI, body fat percentage
    ];

    // Generate PKCE values for enhanced OAuth security
    const { code_verifier, code_challenge } = generatePKCE();

    // Store PKCE code_verifier and state in session for later verification
    const state = crypto.randomBytes(32).toString('hex');
    req.session.oauth = {
      state,                    // Anti-CSRF token
      code_verifier,           // PKCE verifier for token exchange
      timestamp: Date.now()     // For session expiry
    };

    // Save session explicitly and wait for it to complete
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Failed to save session:', err);
          reject(err);
        } else {
          console.log('Session saved successfully. Session ID:', req.sessionID);
          console.log('OAuth state:', req.session.oauth);
          resolve();
        }
      });
    });

    // Construct Fitbit authorization URL with all parameters
    const authUrl = `https://www.fitbit.com/oauth2/authorize?` + 
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `state=${state}&` +
      `code_challenge=${code_challenge}&` +
      `code_challenge_method=S256&` +
      `prompt=consent`; // Force consent screen

    // Log the OAuth request for debugging
    console.log('Initiating Fitbit OAuth with:', {
      clientId,
      redirectUri,
      scopes,
      state: state.substring(0, 8) + '...', // Log partial state for security
      hasCodeChallenge: !!code_challenge,
      sessionID: req.sessionID
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Error in Fitbit auth:', error);
    res.status(500).json({ error: 'Failed to initialize Fitbit authentication' });
  }
});

// OAuth callback endpoint
router.get('/callback', async (req, res) => {
  console.log('Callback received. Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Cookies:', req.cookies);
  console.log('Query params:', req.query);

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
    const oauthState = req.session.fitbitOAuth;
    console.log('OAuth state from session:', oauthState);

    if (!oauthState || oauthState.state !== queryState) {
      console.error('OAuth state mismatch or missing:', {
        sessionState: oauthState?.state,
        queryState,
        sessionID: req.sessionID
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
    const profile = await fitbitClient.getProfile(tokenResponse.access_token);

    // Get activities
    const activities = await fitbitClient.getActivities(tokenResponse.access_token);

    // Clear OAuth state from session
    delete req.session.fitbitOAuth;
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
            tokens: ${JSON.stringify(tokenResponse)},
            allData: ${JSON.stringify(activities)}
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
    const profileResponse = await axios.get('https://api.fitbit.com/1/user/-/profile.json', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // Return relevant profile data
    res.json({
      profile: profileResponse.data.user
    });

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

    res.json({ success: true });

  } catch (error) {
    console.error('Error storing Fitbit tokens:', error);
    res.status(500).json({ error: 'Failed to store Fitbit tokens' });
  }
});

module.exports = router; 