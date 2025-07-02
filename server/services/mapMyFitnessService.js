const axios = require('axios');

const MAPMY_API_BASE = 'https://api.mapmyfitness.com/v7.1';
const API_KEY = process.env.MAPMYFITNESS_CLIENT_ID;
const CLIENT_SECRET = process.env.MAPMYFITNESS_CLIENT_SECRET;
require('dotenv').config();

/**
 * Request a suggested route from MapMyFitness
 * @param {string} location - Location string like "Red Rock Canyon"
 * @param {number} distance - Distance in meters
 * @param {string} [activity] - Optional: "run", "walk", etc.
 */
async function getSuggestedRoute(location, distance, activity = 'run') {
  try {
    // Geocode the location to lat/lon — replace with real geocoder if needed
    const coordinates = await mockGeocode(location);

    const accessToken = await getAccessToken();

    const queryParams = new URLSearchParams({
        close_to_location: `${coordinates.lat.toFixed(4)},${coordinates.lon.toFixed(4)}`,
        minimum_distance: Math.max(distance * 0.8, 500).toFixed(0),
        maximum_distance: (distance * 1.2).toFixed(0),
        limit: 5
      });
      
      // 🚫 Remove activity_type if causing 500 errors
      // If needed, test adding it back one activity at a time
      // queryParams.set('activity_type', activity);
      
      const response = await axios.get(`${MAPMY_API_BASE}/route/?${queryParams.toString()}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`        }
      });

    return response.data._embedded?.routes || [];
  } catch (error) {
    console.error('❌ FULL ERROR:', JSON.stringify({
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          method: error.config?.method,
          url: error.config?.url,
          headers: error.config?.headers
        }
      }, null, 2));
      throw error;
  }
}

async function getAccessToken() {
  const tokenUrl = `${MAPMY_API_BASE}/oauth2/access_token/`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: API_KEY,
    client_secret: CLIENT_SECRET
  });

  const response = await axios.post(tokenUrl, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Api-Key': API_KEY
    }
  });
  console.log('🔐 Access token:', response.data.access_token);
  return response.data.access_token;
}


// TEMPORARY: Replace with OpenAI or real geocoder
async function mockGeocode(location) {
  if (location.toLowerCase().includes('red rock')) {
    return { lat: 36.1358, lon: -115.4270 };
  }

  // Default to Las Vegas Strip
  return { lat: 36.1147, lon: -115.1728 };
}

module.exports = {
  getSuggestedRoute
};
