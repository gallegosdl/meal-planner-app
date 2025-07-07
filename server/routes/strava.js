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

    const timezoneOffset = parseInt(req.query.timezoneOffset, 10) || 0;
    const state = crypto.randomBytes(32).toString('hex');

    req.session.stravaOauth = {
      state,
      timestamp: Date.now(),
      timezoneOffset
    };

    await new Promise((resolve, reject) => {
      req.session.save(err => (err ? reject(err) : resolve()));
    });

    const authUrl = `https://www.strava.com/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=read,activity:read_all,activity:write,profile:read_all&` +
      `state=${state}&` +
      `approval_prompt=force`;

    res.json({ authUrl });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Failed to initiate Strava OAuth' });
  }
});


// Callback endpoint for Strava OAuth
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!req.session.stravaOauth ||
        !req.session.stravaOauth.state ||
        state !== req.session.stravaOauth.state ||
        Date.now() - req.session.stravaOauth.timestamp > 300000) {
      throw new Error('Invalid or expired OAuth session');
    }

    const userOffsetMinutes = req.session.stravaOauth.timezoneOffset || 0;
    delete req.session.stravaOauth;

    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });

    const {
      access_token,
      refresh_token,
      expires_at,
      athlete
    } = tokenResponse.data;

    const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { 'Authorization': `Bearer ${access_token}` },
      params: { per_page: 30, page: 1 }
    });

    const nowUTC = new Date();
    const localNow = new Date(nowUTC.getTime() - userOffsetMinutes * 60 * 1000);
    const userTodayString = localNow.toISOString().slice(0, 10);

    const todaysActivities = activitiesResponse.data.filter(activity => {
      const activityUTC = new Date(activity.start_date);
      const activityLocal = new Date(activityUTC.getTime() - userOffsetMinutes * 60 * 1000);
      return activityLocal.toISOString().slice(0, 10) === userTodayString;
    });

    const detailedActivities = await Promise.all(
      todaysActivities.map(async (activity) => {
        try {
          const detailResponse = await axios.get(
            `https://www.strava.com/api/v3/activities/${activity.id}`,
            { headers: { 'Authorization': `Bearer ${access_token}` } }
          );

          let calories = detailResponse.data.calories;
          if (!calories && detailResponse.data.kilojoules) {
            calories = Math.round(detailResponse.data.kilojoules * 0.239);
          }
          if (!calories) {
            const duration = detailResponse.data.moving_time;
            const type = detailResponse.data.type.toLowerCase();
            const metValues = { run: 8, ride: 6, swim: 7, walk: 3.5, hike: 5.3, workout: 5 };
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
        } catch {
          return activity;
        }
      })
    );

    const totalCaloriesToday = detailedActivities.reduce((sum, activity) => sum + (activity.calories || 0), 0);

    req.session.strava = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_at,
      athlete,
      obtainedAt: new Date().toISOString()
    };

    await new Promise((resolve, reject) => {
      req.session.save(err => (err ? reject(err) : resolve()));
    });

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
    const errorMessage = error.response?.data?.message || error.message || 'Failed to authenticate with Strava';
    const clientOrigin = process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-frontend-woan.onrender.com'
      : 'http://localhost:3000';

    res.send(`
      <html>
        <body>
          <script>
            const errorMessage = ${JSON.stringify(errorMessage)};
            if (window.opener) {
              window.opener.postMessage({
                type: 'strava_callback',
                error: errorMessage
              }, '${clientOrigin}');
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