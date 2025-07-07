// Strava API integration
// This file handles the OAuth process, token exchange, and activity fetching
// It also includes endpoints for profile, activity details, and recent activities
// The Strava API is used to get user's activities and calculate calories burned
// The Strava API is also used to get user's profile information
// The Strava API is also used to get user's recent activities
// The Strava API is also used to get user's activity details
// The Strava API is also used to get user's activity details
const express = require('express');
const axios = require('axios');
const router = express.Router();
const crypto = require('crypto');

// Endpoint to initiate Strava OAuth
router.get('/auth', async (req, res) => {
  try {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-app-3m20.onrender.com/api/strava/callback'
      : 'http://localhost:3001/api/strava/callback';
    
    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in session for verification
    req.session.stravaOauth = {
      state,
      timestamp: Date.now()
    };

    // Debug session before save
    console.log('Session before save:', {
      id: req.sessionID,
      oauth: req.session.stravaOauth,
      cookie: req.session.cookie,
      hasSession: !!req.session
    });

    // Save session explicitly before sending response
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

    // Construct Strava authorization URL
    const authUrl = `https://www.strava.com/oauth/authorize?` + 
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=read,activity:read_all,activity:write,profile:read_all&` +
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
  } catch (error) {
    console.error('Strava OAuth error:', error);
    res.status(500).json({ error: 'Failed to initiate Strava OAuth' });
  }
});

// Callback endpoint for Strava OAuth
router.get('/callback', async (req, res) => {
  console.log('\n=== Strava Callback Started ===');
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
    const { code, state } = req.query;
    console.log('Strava callback params:', { 
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
      console.error('OAuth validation failed:', {
        hasSession: !!req.session.stravaOauth,
        hasSessionState: !!req.session.stravaOauth?.state,
        stateMatch: state === req.session.stravaOauth?.state,
        timeValid: Date.now() - (req.session.stravaOauth?.timestamp || 0) <= 300000
      });
      throw new Error('Invalid or expired OAuth session');
    }

    delete req.session.stravaOauth; // Clear OAuth session data
    console.log('OAuth session validated and cleared');

    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-app-3m20.onrender.com/api/strava/callback'
      : 'http://localhost:3001/api/strava/callback';

    console.log('Exchanging code for tokens...');
    console.log('Using client ID:', clientId);

    // Exchange authorization code for tokens
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code'
      }
    );

    console.log('Token exchange successful:', {
      hasAccessToken: !!tokenResponse.data.access_token,
      hasRefreshToken: !!tokenResponse.data.refresh_token,
      hasAthlete: !!tokenResponse.data.athlete
    });

    const {
      access_token,
      refresh_token,
      expires_at,
      athlete
    } = tokenResponse.data;

    // Fetch recent activities
    console.log('Fetching Strava activities...');
    // Get start of today in Unix timestamp
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayTimestamp = Math.floor(todayStart.getTime() / 1000);
    console.log('Today timestamp:', todayTimestamp);


    const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      params: {
        per_page: 10,
        page: 1,
        after: todayTimestamp // Only get activities after start of today
      }
    });

    // User timezone math
    const userOffsetMinutes = req.session.stravaOauth?.timezoneOffset || 0;
    const nowUTC = new Date();
    const localNow = new Date(nowUTC.getTime() - userOffsetMinutes * 60 * 1000);
    const userTodayString = localNow.toISOString().slice(0, 10);

    // Filter for today's local activities
    const allActivities = activitiesResponse.data;
    const todaysActivities = allActivities.filter(activity => {
      const activityUTC = new Date(activity.start_date);
      const activityLocal = new Date(activityUTC.getTime() - userOffsetMinutes * 60 * 1000);
      const activityDateString = activityLocal.toISOString().slice(0, 10);
      return activityDateString === userTodayString;
    });

    // Log
    console.log(`User's local today: ${userTodayString}`);
    console.log(`Activities found for today: ${todaysActivities.length}`);

    // Log raw activities response
    console.log('Raw Strava activities response:', JSON.stringify(activitiesResponse.data, null, 2));

    // Fetch detailed data for each activity
    const activities = activitiesResponse.data;
    console.log(`Fetching details for ${activities.length} today's activities...`);
    
    const detailedActivities = await Promise.all(
      activities.map(async (activity) => {
        try {
          const detailResponse = await axios.get(
            `https://www.strava.com/api/v3/activities/${activity.id}`,
            {
              headers: {
                'Authorization': `Bearer ${access_token}`
              }
            }
          );

          console.log('Detailed activity response:', {
            id: activity.id,
            type: detailResponse.data.type,
            name: detailResponse.data.name,
            sport_type: detailResponse.data.sport_type,
            full_response: JSON.stringify(detailResponse.data, null, 2)
          });

          // Calculate calories if needed
          let calories = detailResponse.data.calories;
          if (!calories && detailResponse.data.kilojoules) {
            calories = Math.round(detailResponse.data.kilojoules * 0.239); // Convert kJ to kcal
          }
          if (!calories) {
            const duration = detailResponse.data.moving_time; // in seconds
            const type = detailResponse.data.type.toLowerCase();
            const metValues = {
              run: 8,
              ride: 6,
              swim: 7,
              walk: 3.5,
              hike: 5.3,
              workout: 5
            };
            const met = metValues[type] || 5;
            const weight = athlete.weight || 70;
            calories = Math.round((met * weight * (duration / 3600)));
          }

          return {
            ...activity,
            calories,
            kilojoules: detailResponse.data.kilojoules,
            average_heartrate: detailResponse.data.average_heartrate,
            max_heartrate: detailResponse.data.max_heartrate
          };
        } catch (error) {
          console.error(`Error fetching details for activity ${activity.id}:`, error.message);
          return activity; // Return basic activity data if detail fetch fails
        }
      })
    );

    // Calculate total calories burned today
    const totalCaloriesToday = detailedActivities.reduce((sum, activity) => sum + (activity.calories || 0), 0);
    console.log('Total calories burned today:', totalCaloriesToday);

    // Store tokens in session
    req.session.strava = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_at,
      athlete,
      obtainedAt: new Date().toISOString()
    };

    console.log('Storing session data...');
    // Save session explicitly
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          reject(err);
        } else {
          console.log('Session saved successfully');
          resolve();
        }
      });
    });

    const clientOrigin = process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-frontend-woan.onrender.com'
      : 'http://localhost:3000';

    console.log('Sending response to client:', {
      hasAthlete: !!athlete,
      hasActivities: !!detailedActivities.length,
      clientOrigin
    });

    // Send HTML that posts message to parent window with all data
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
                  activities: ${JSON.stringify(detailedActivities)},
                  dailyCalories: ${totalCaloriesToday}
                }
              }, '${clientOrigin}');
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
                  activities: ${JSON.stringify(detailedActivities)},
                  dailyCalories: ${totalCaloriesToday}
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

    // Fetch detailed data for each activity
    const activities = activitiesResponse.data;
    console.log(`Fetching details for ${activities.length} activities...`);
    
    const detailedActivities = await Promise.all(
      activities.map(async (activity) => {
        try {
          const detailResponse = await axios.get(
            `https://www.strava.com/api/v3/activities/${activity.id}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          // Calculate calories if needed
          let calories = detailResponse.data.calories;
          if (!calories && detailResponse.data.kilojoules) {
            calories = Math.round(detailResponse.data.kilojoules * 0.239); // Convert kJ to kcal
          }
          if (!calories) {
            const duration = detailResponse.data.moving_time; // in seconds
            const type = detailResponse.data.type.toLowerCase();
            const metValues = {
              run: 8,
              ride: 6,
              swim: 7,
              walk: 3.5,
              hike: 5.3,
              workout: 5
            };
            const met = metValues[type] || 5;
            const weight = req.session.strava?.athlete?.weight || 70;
            calories = Math.round((met * weight * (duration / 3600)));
          }

          return {
            ...activity,
            calories,
            kilojoules: detailResponse.data.kilojoules,
            average_heartrate: detailResponse.data.average_heartrate,
            max_heartrate: detailResponse.data.max_heartrate
          };
        } catch (error) {
          console.error(`Error fetching details for activity ${activity.id}:`, error.message);
          return activity; // Return basic activity data if detail fetch fails
        }
      })
    );

    res.json({
      activities: detailedActivities
    });

  } catch (error) {
    console.error('Error fetching Strava activities:', error);
    
    if (error.response?.status === 401) {
      delete req.session.strava;
      return res.status(401).json({ error: 'Strava session expired' });
    }

    res.status(500).json({ 
      error: 'Failed to fetch Strava activities',
      details: error.message
    });
  }
});

// Get detailed activity data including calories
router.get('/activity/:activityId', async (req, res) => {
  console.log('\n=== Fetching Activity Details ===');
  console.log('Activity ID:', req.params.activityId);
  
  try {
    // Check if user is authenticated with Strava
    if (!req.session.strava?.accessToken) {
      console.log('No Strava access token in session');
      return res.status(401).json({ error: 'Not authenticated with Strava' });
    }

    const accessToken = req.session.strava.accessToken;
    const activityId = req.params.activityId;

    console.log('Using access token:', accessToken.substring(0, 8) + '...');

    // Get detailed activity data from Strava API
    const activityResponse = await axios.get(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    console.log('Activity details received:', {
      id: activityResponse.data.id,
      type: activityResponse.data.type,
      hasCalories: !!activityResponse.data.calories,
      kilojoules: activityResponse.data.kilojoules
    });

    // For cycling activities, convert kilojoules to calories (if calories not provided)
    let calories = activityResponse.data.calories;
    if (!calories && activityResponse.data.kilojoules) {
      calories = Math.round(activityResponse.data.kilojoules * 0.239); // Convert kJ to kcal
    }

    // Estimate calories if not provided (basic estimation)
    if (!calories) {
      const duration = activityResponse.data.moving_time; // in seconds
      const type = activityResponse.data.type.toLowerCase();
      
      // Very basic MET-based calculation
      const metValues = {
        run: 8,
        ride: 6,
        swim: 7,
        walk: 3.5,
        hike: 5.3,
        workout: 5
      };
      
      const met = metValues[type] || 5; // default MET value
      const weight = req.session.strava?.athlete?.weight || 70; // default weight if not available
      
      // Calories = MET * weight in kg * duration in hours
      calories = Math.round((met * weight * (duration / 3600)));
    }

    const response = {
      id: activityResponse.data.id,
      name: activityResponse.data.name,
      type: activityResponse.data.type,
      calories: calories,
      distance: activityResponse.data.distance,
      moving_time: activityResponse.data.moving_time,
      total_elevation_gain: activityResponse.data.total_elevation_gain,
      start_date: activityResponse.data.start_date,
      average_speed: activityResponse.data.average_speed,
      max_speed: activityResponse.data.max_speed,
      average_heartrate: activityResponse.data.average_heartrate,
      max_heartrate: activityResponse.data.max_heartrate,
      kilojoules: activityResponse.data.kilojoules
    };

    console.log('Sending response with calories:', calories);
    res.json(response);

  } catch (error) {
    console.error('Error fetching activity details:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      delete req.session.strava;
      return res.status(401).json({ error: 'Strava session expired' });
    }

    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch activity details',
      details: error.message,
      strava_error: error.response?.data
    });
  }
});

// Upload a new activity to Strava
router.post('/upload-activity', async (req, res) => {
  try {
    // Must be authenticated
    if (!req.session.strava?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated with Strava' });
    }

    const accessToken = req.session.strava.accessToken;
    const activity = req.body.activity;

    if (!activity || !activity.type || !activity.startDate || !activity.elapsedTime) {
      return res.status(400).json({ error: 'Missing required activity fields' });
    }

    // Build Strava POST body
    const body = {
      name: activity.name || `${activity.type} Activity`,
      type: activity.type,
      start_date_local: activity.startDate,
      elapsed_time: activity.elapsedTime,
      description: activity.description || '',
      distance: activity.distance || 0,
      trainer: activity.trainer || false,
      commute: activity.commute || false
    };

    console.log('Posting to Strava with:', JSON.stringify(body, null, 2));

    // POST to Strava
    const stravaResponse = await axios.post(
      'https://www.strava.com/api/v3/activities',
      body,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Strava response:', JSON.stringify(stravaResponse.data, null, 2));

    res.json({
      message: 'Activity uploaded to Strava successfully!',
      activity: stravaResponse.data
    });

  } catch (error) {
    console.error('Error uploading Strava activity:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to upload activity to Strava', details: error?.response?.data });
  }
});

module.exports = router;