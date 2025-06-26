const axios = require('axios');

class FitbitClient {
  constructor() {
    this.clientId = process.env.FITBIT_CLIENT_ID;
    this.clientSecret = process.env.FITBIT_CLIENT_SECRET;
    this.baseUrl = 'https://api.fitbit.com';
  }

  async getAccessToken({ code, code_verifier, redirect_uri }) {
    console.log('Getting access token with:', {
      code: code.substring(0, 10) + '...',
      code_verifier: code_verifier.substring(0, 10) + '...',
      redirect_uri
    });

    const tokenUrl = 'https://api.fitbit.com/oauth2/token';
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    try {
      const response = await axios.post(tokenUrl, 
        new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          code_verifier,
          redirect_uri,
          client_id: this.clientId
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('Token response received:', {
        hasAccessToken: !!response.data.access_token,
        hasRefreshToken: !!response.data.refresh_token,
        expiresIn: response.data.expires_in
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      console.error('Error getting access token:', {
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  async getProfile(accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/1/user/-/profile.json`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.data.user;
    } catch (error) {
      console.error('Error getting profile:', error.response?.data);
      throw error;
    }
  }

  async getActivities(accessToken) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(
        `${this.baseUrl}/1/user/-/activities/date/${today}.json`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting activities:', error.response?.data);
      throw error;
    }
  }
}

module.exports = new FitbitClient(); 