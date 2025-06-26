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
router.get('/auth', (req, res) => {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const redirectUri = process.env.FITBIT_REDIRECT_URI || (process.env.NODE_ENV === 'production'
    ? 'https://meal-planner-app-3m20.onrender.com/api/fitbit/callback'
    : 'http://localhost:3001/api/fitbit/callback');
  
  // All available Fitbit scopes as of 2024
  // Only request what your app needs - requesting all scopes may reduce user trust
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
  // code_verifier must be sent in token exchange to prove we're the same app
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauth = {
    state,                    // Anti-CSRF token
    code_verifier,           // PKCE verifier for token exchange
    timestamp: Date.now()     // For session expiry
  };

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
    hasCodeChallenge: !!code_challenge
  });

  res.json({ authUrl });
});

// Update the callback endpoint to use the new function
router.get('/callback', async (req, res) => {
  // Define clientOrigin at the start of the route handler
  const clientOrigin = process.env.NODE_ENV === 'production'
    ? 'https://meal-planner-frontend-woan.onrender.com'
    : 'http://localhost:3000';

  try {
    const { code, state } = req.query;

    // Validate state and ensure OAuth session exists
    if (!req.session.oauth || 
        !req.session.oauth.state || 
        state !== req.session.oauth.state ||
        Date.now() - req.session.oauth.timestamp > 300000) { // 5 minute expiry
      throw new Error('Invalid or expired OAuth session');
    }

    const { code_verifier } = req.session.oauth;
    delete req.session.oauth; // Clear OAuth session data

    const clientId = process.env.FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;
    const redirectUri = process.env.FITBIT_REDIRECT_URI || (process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-app-3m20.onrender.com/api/fitbit/callback'
      : 'http://localhost:3001/api/fitbit/callback');

    // Exchange authorization code for tokens using PKCE verification
    // We include the original code_verifier to prove we're the same app that initiated the flow
    const tokenResponse = await axios.post('https://api.fitbit.com/oauth2/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,                    // The auth code from Fitbit
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier            // PKCE verification - must match the challenge we sent
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const {
      access_token,
      refresh_token,
      expires_in,
      scope
    } = tokenResponse.data;

    // Fetch all available data
    const allFitbitData = await fetchAllFitbitData(access_token, scope);

    // Store tokens and scope in session
    req.session.fitbit = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      scope,
      obtainedAt: new Date().toISOString()
    };

    // Save session explicitly
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Send HTML that posts message to parent window with all data
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'fitbit_callback',
                data: {
                  profile: ${JSON.stringify({
                    ...allFitbitData.profile.user,
                    scope
                  })},
                  tokens: {
                    accessToken: '${access_token}',
                    refreshToken: '${refresh_token}',
                    expiresIn: ${expires_in},
                    scope: '${scope}'
                  },
                  allData: ${JSON.stringify(allFitbitData)}
                }
              }, '${clientOrigin}');
              window.close();
            } else {
              window.location.href = '${clientOrigin}/fitbit/success?data=' + 
                encodeURIComponent(JSON.stringify({
                  profile: ${JSON.stringify({
                    ...allFitbitData.profile.user,
                    scope
                  })},
                  tokens: {
                    accessToken: '${access_token}',
                    refreshToken: '${refresh_token}',
                    expiresIn: ${expires_in},
                    scope: '${scope}'
                  },
                  allData: ${JSON.stringify(allFitbitData)}
                }));
            }
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Fitbit OAuth error:', error);
    
    const errorMessage = error.response?.data?.errors?.[0]?.message 
      || error.message 
      || 'Failed to authenticate with Fitbit';

    // Send error HTML that handles both popup and redirect cases
    res.send(`
      <html>
        <body>
          <script>
            const errorMessage = ${JSON.stringify(errorMessage)};
            if (window.opener) {
              window.opener.postMessage({
                type: 'fitbit_callback',
                error: errorMessage
              }, '${clientOrigin}');
              window.close();
            } else {
              window.location.href = '${clientOrigin}/fitbit/error?message=' + 
                encodeURIComponent(errorMessage);
            }
          </script>
        </body>
      </html>
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