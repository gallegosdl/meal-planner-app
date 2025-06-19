const express = require('express');
const axios = require('axios');
const router = express.Router();
const crypto = require('crypto');

// Endpoint to initiate Strava OAuth
router.get('/auth', (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = 'http://localhost:3001/api/strava/callback';
  
  // Generate state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');
  
  // Store state in session for verification
  req.session.stravaOauth = {
    state,
    timestamp: Date.now()
  };

  // Construct Strava authorization URL
  const authUrl = `https://www.strava.com/oauth/authorize?` + 
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=read,activity:read_all,profile:read_all&` +
    `state=${state}&` +
    `approval_prompt=force`;

  // Log the OAuth request for debugging
  console.log('Initiating Strava OAuth with:', {
    clientId,
    redirectUri,
    state: state.substring(0, 8) + '...',
    authUrl
  });

  res.json({ authUrl });
});

// Callback endpoint for Strava OAuth
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    console.log('Strava callback received:', { 
      hasCode: !!code,
      hasState: !!state,
      sessionState: req.session.stravaOauth?.state?.substring(0, 8) + '...',
      sessionTimestamp: req.session.stravaOauth?.timestamp
    });

    // Validate state and ensure OAuth session exists
    if (!req.session.stravaOauth || 
        !req.session.stravaOauth.state || 
        state !== req.session.stravaOauth.state ||
        Date.now() - req.session.stravaOauth.timestamp > 300000) { // 5 minute expiry
      throw new Error('Invalid or expired OAuth session');
    }

    delete req.session.stravaOauth; // Clear OAuth session data

    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    const redirectUri = 'http://localhost:3001/api/strava/callback';

    console.log('Exchanging code for tokens...');

    // Exchange authorization code for tokens
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code'
      }
    );

    console.log('Token exchange successful, received athlete data');

    const {
      access_token,
      refresh_token,
      expires_at,
      athlete
    } = tokenResponse.data;

    // Fetch recent activities
    const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      params: {
        per_page: 10, // Get last 10 activities
        page: 1
      }
    });

    console.log('Strava activities fetched:', activitiesResponse.data.length);

    // Store tokens in session
    req.session.strava = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_at,
      athlete,
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
    const clientOrigin = process.env.NODE_ENV === 'production' 
      ? 'https://meal-planner-frontend-woan.onrender.com'
      : 'http://localhost:3000';

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'strava_callback',
                data: {
                  profile: ${JSON.stringify(athlete)},
                  tokens: {
                    accessToken: '${access_token}',
                    refreshToken: '${refresh_token}',
                    expiresAt: ${expires_at}
                  },
                  activities: ${JSON.stringify(activitiesResponse.data)}
                }
              }, '${clientOrigin}');  // Use specific origin instead of *
              window.close();
            } else {
              window.location.href = '${clientOrigin}/strava/success?data=' + 
                encodeURIComponent(JSON.stringify({
                  profile: ${JSON.stringify(athlete)},
                  tokens: {
                    accessToken: '${access_token}',
                    refreshToken: '${refresh_token}',
                    expiresAt: ${expires_at}
                  },
                  activities: ${JSON.stringify(activitiesResponse.data)}
                }));
            }
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Strava OAuth error:', error);
    
    const errorMessage = error.response?.data?.message 
      || error.message 
      || 'Failed to authenticate with Strava';

    // Send error HTML that handles both popup and redirect cases
    res.send(`
      <html>
        <body>
          <script>
            const errorMessage = ${JSON.stringify(errorMessage)};
            if (window.opener) {
              window.opener.postMessage({
                type: 'strava_callback',
                error: errorMessage
              }, '${clientOrigin}');  // Use specific origin instead of *
              window.close();
            } else {
              window.location.href = '${clientOrigin}/strava/error?message=' + 
                encodeURIComponent(errorMessage);
            }
          </script>
        </body>
      </html>
    `);
  }
});

// Get current user's Strava profile
router.get('/profile', async (req, res) => {
  try {
    // Check if user is authenticated with Strava
    if (!req.session.strava?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated with Strava' });
    }

    const accessToken = req.session.strava.accessToken;

    // Get user's Strava profile
    const profileResponse = await axios.get('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.json({
      athlete: profileResponse.data
    });

  } catch (error) {
    console.error('Error fetching Strava profile:', error);
    
    // Check if token expired
    if (error.response?.status === 401) {
      // Clear invalid session
      delete req.session.strava;
      return res.status(401).json({ error: 'Strava session expired' });
    }

    res.status(500).json({ 
      error: 'Failed to fetch Strava profile',
      details: error.message
    });
  }
});

// Store Strava tokens in session
router.post('/store-tokens', async (req, res) => {
  try {
    const { accessToken, refreshToken, expiresAt } = req.body;
    
    if (!accessToken || !refreshToken || !expiresAt) {
      return res.status(400).json({ error: 'Missing required token data' });
    }

    // Store tokens in session
    req.session.strava = {
      accessToken,
      refreshToken,
      expiresAt,
      obtainedAt: new Date().toISOString()
    };

    // Save session explicitly to ensure it's stored
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Error storing Strava tokens:', error);
    res.status(500).json({ error: 'Failed to store Strava tokens' });
  }
});

// Get recent activities
router.get('/activities', async (req, res) => {
  console.log('Strava activities endpoint hit');
  try {
    // Check if user is authenticated with Strava
    if (!req.session.strava?.accessToken) {
      console.log('No Strava access token in session');
      return res.status(401).json({ error: 'Not authenticated with Strava' });
    }

    const accessToken = req.session.strava.accessToken;
    console.log('Using Strava access token:', accessToken.substring(0, 8) + '...');

    // Get user's recent activities
    const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        per_page: 10,
        page: 1
      }
    });

    res.json({
      activities: activitiesResponse.data
    });

  } catch (error) {
    console.error('Error fetching Strava activities:', error);
    
    // Check if token expired
    if (error.response?.status === 401) {
      // Clear invalid session
      delete req.session.strava;
      return res.status(401).json({ error: 'Strava session expired' });
    }

    res.status(500).json({ 
      error: 'Failed to fetch Strava activities',
      details: error.message
    });
  }
});

module.exports = router;