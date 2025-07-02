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
  
  // Get date ranges in local time - force moment to use local timezone
  console.log('Current moment (local):', moment().local().format());
  console.log('Current system time:', new Date().toISOString());
  
  // Force moment to use local timezone
  const today = moment().local().format('YYYY-MM-DD');
  const yesterday = moment().local().subtract(1, 'days').format('YYYY-MM-DD');
  const lastMonth = moment().local().subtract(1, 'month').format('YYYY-MM-DD');
  
  console.log('Local date values:', { today, yesterday, lastMonth });
  
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
    console.log('Fetching activities with:', {
      today,
      yesterday,
      tokenPrefix: accessToken.substring(0, 10) + '...'
    });
    
    const [todayActivities, yesterdayActivities, lifetime] = await Promise.all([
      safeFitbitFetch(
        `https://api.fitbit.com/1/user/-/activities/date/${today}.json`,
        headers
      ),
      safeFitbitFetch(
        `https://api.fitbit.com/1/user/-/activities/date/${yesterday}.json`,
        headers
      ),
      safeFitbitFetch(
        'https://api.fitbit.com/1/user/-/activities.json',
        headers
      )
    ]);

    // Merge activities from both days
    const activities = {
      activities: [
        ...(todayActivities?.activities || []),
        ...(yesterdayActivities?.activities || [])
      ],
      goals: todayActivities?.goals || yesterdayActivities?.goals,
      summary: todayActivities?.summary || yesterdayActivities?.summary
    };

    console.log('Raw activities response:', JSON.stringify(activities, null, 2));
    data.activities = { daily: activities, lifetime };
  }

  // Heart rate data
  if (scopes.includes('heartrate')) {
    data.heartRate = await safeFitbitFetch(
      `https://api.fitbit.com/1/user/-/activities/heart/date/${yesterday}/1d.json`,
      headers
    );
  }

  // Sleep data
  if (scopes.includes('sleep')) {
    data.sleep = await safeFitbitFetch(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${yesterday}.json`,
      headers
    );
  }

  // Nutrition data
  if (scopes.includes('nutrition')) {
    const [foods, water] = await Promise.all([
      safeFitbitFetch(
        `https://api.fitbit.com/1/user/-/foods/log/date/${yesterday}.json`,
        headers
      ),
      safeFitbitFetch(
        `https://api.fitbit.com/1/user/-/foods/log/water/date/${yesterday}.json`,
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
    
    // Correct Fitbit scope format
    const scopes = [
      'activity',    // Activity and exercise data
      'heartrate',   // Heart rate data
      'location',    // Location data
      'nutrition',   // Food logging data
      'profile',     // Basic user info
      'settings',    // User settings
      'sleep',       // Sleep logs
      'social',      // Friend data
      'weight'       // Weight data
    ];

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
    const tokenUrl = 'https://api.fitbit.com/oauth2/token';
    const auth = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
    
    console.log('Getting access token with:', {
      code: code.substring(0, 10) + '...',
      code_verifier: oauthState.code_verifier.substring(0, 10) + '...',
      redirect_uri: process.env.NODE_ENV === 'production'
        ? 'https://meal-planner-app-3m20.onrender.com/api/fitbit/callback'
        : 'http://localhost:3001/api/fitbit/callback'
    });

    const tokenResponse = await axios.post(tokenUrl,
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        code_verifier: oauthState.code_verifier,
        redirect_uri: process.env.NODE_ENV === 'production'
          ? 'https://meal-planner-app-3m20.onrender.com/api/fitbit/callback'
          : 'http://localhost:3001/api/fitbit/callback',
        client_id: process.env.FITBIT_CLIENT_ID
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Token response received:', {
      hasAccessToken: !!tokenResponse.data.access_token,
      hasRefreshToken: !!tokenResponse.data.refresh_token,
      expiresIn: tokenResponse.data.expires_in
    });

    // Get all Fitbit data
    const allFitbitData = await fetchAllFitbitData(
      tokenResponse.data.access_token,
      tokenResponse.data.scope
    );
    
    console.log('Fetched Fitbit data:', {
      hasProfile: !!allFitbitData.profile,
      hasActivities: !!allFitbitData.activities,
      activitiesData: allFitbitData.activities
    });

    // Store tokens in session
    req.session.fitbit = {
      accessToken: tokenResponse.data.access_token,
      refreshToken: tokenResponse.data.refresh_token,
      expiresIn: tokenResponse.data.expires_in,
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
                  profile: ${JSON.stringify(allFitbitData.profile?.user || {})},
                  tokens: ${JSON.stringify({
                    accessToken: tokenResponse.data.access_token,
                    refreshToken: tokenResponse.data.refresh_token,
                    expiresIn: tokenResponse.data.expires_in
                  })},
                  allData: ${JSON.stringify(allFitbitData)}
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

// Debug endpoint to get current token (TEMPORARY)
router.get('/debug-token', (req, res) => {
  if (!req.session.fitbit?.accessToken) {
    return res.status(401).json({ error: 'No Fitbit token in session' });
  }
  
  console.log('Current session data:', {
    hasToken: !!req.session.fitbit.accessToken,
    tokenPrefix: req.session.fitbit.accessToken.substring(0, 10) + '...',
    obtainedAt: req.session.fitbit.obtainedAt
  });
  
  res.json({ 
    token: req.session.fitbit.accessToken,
    obtainedAt: req.session.fitbit.obtainedAt
  });
});

// Debug endpoint to get raw activities
router.get('/debug-activities', async (req, res) => {
  try {
    if (!req.session.fitbit?.accessToken) {
      return res.status(401).json({ error: 'No Fitbit token in session' });
    }

    const accessToken = req.session.fitbit.accessToken;
    const today = moment().local().format('YYYY-MM-DD');
    const yesterday = moment().local().subtract(1, 'days').format('YYYY-MM-DD');

    console.log('Fetching activities with local time:', {
      today,
      yesterday,
      currentLocal: moment().local().format()
    });

    // Get raw activities data for both days
    const [todayActivities, yesterdayActivities] = await Promise.all([
      safeFitbitFetch(
        `https://api.fitbit.com/1/user/-/activities/date/${today}.json`,
        { 'Authorization': `Bearer ${accessToken}` }
      ),
      safeFitbitFetch(
        `https://api.fitbit.com/1/user/-/activities/date/${yesterday}.json`,
        { 'Authorization': `Bearer ${accessToken}` }
      )
    ]);

    // Merge activities
    const activities = {
      activities: [
        ...(todayActivities?.activities || []),
        ...(yesterdayActivities?.activities || [])
      ],
      goals: todayActivities?.goals || yesterdayActivities?.goals,
      summary: todayActivities?.summary || yesterdayActivities?.summary
    };

    console.log('Raw activities response:', JSON.stringify(activities, null, 2));
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Log a new activity to Fitbit
router.post('/log-fitbit-activity', async (req, res) => {
  try {
    // Must be authenticated
    if (!req.session.fitbit?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated with Fitbit' });
    }

    const accessToken = req.session.fitbit.accessToken;
    let activity = req.body.activity;

    if (!activity || !activity.activityType) {
      return res.status(400).json({ error: 'Missing required activityType' });
    }

    // === Normalize Start Time ===
    const padTime = (time) => {
      if (!time) return "06:00";
      const [h = '06', m = '00'] = time.split(':');
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    };

    if (!activity.startTime) {
      console.warn('⚠️ No startTime provided. Defaulting to 06:00.');
      activity.startTime = '06:00';
    }
    activity.startTime = padTime(activity.startTime);

    // === Validate Numerics ===
    const toNumberOrNull = (value) => {
      const n = parseFloat(value);
      return isNaN(n) ? null : n;
    };

    activity.durationMinutes = toNumberOrNull(activity.durationMinutes) ?? 30;
    activity.distanceMiles = toNumberOrNull(activity.distanceMiles);
    activity.caloriesBurned = toNumberOrNull(activity.caloriesBurned);

    // === Build Fitbit POST body ===
    const body = new URLSearchParams();

    body.append('activityName', activity.activityType);
    body.append('startTime', activity.startTime);
    body.append('durationMillis', String(activity.durationMinutes * 60 * 1000));
    body.append('date', moment().format('YYYY-MM-DD'));

    if (activity.caloriesBurned !== null) {
      body.append('manualCalories', String(activity.caloriesBurned));
    }

    if (activity.distanceMiles !== null) {
      body.append('distance', String(activity.distanceMiles));
      body.append('distanceUnit', 'mile'); // Fitbit wants lowercase singular
    }

    console.log('✅ Posting to Fitbit with:', body.toString());

    // === POST to Fitbit API ===
    const fitbitResponse = await axios.post(
      'https://api.fitbit.com/1/user/-/activities.json',
      body.toString(),
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ Fitbit response:', JSON.stringify(fitbitResponse.data, null, 2));

    res.json({
      success: true,
      message: 'Activity logged to Fitbit successfully!',
      fitbitResponse: fitbitResponse.data
    });

  } catch (error) {
    console.error('❌ Error logging Fitbit activity:', error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to log activity to Fitbit',
      details: error?.response?.data
    });
  }
});

module.exports = router; 