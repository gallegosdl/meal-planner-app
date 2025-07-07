import api from '../services/api';

export const authHandler = {
  login: async (credentials) => {
    try {
      const response = await api.post('/api/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw new Error('Login failed: ' + error.message);
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      throw new Error('Logout failed: ' + error.message);
    }
  },

  verifySession: async () => {
    try {
      const response = await api.get('/api/auth/verify-session');
      return response.data;
    } catch (error) {
      throw new Error('Session verification failed: ' + error.message);
    }
  },

  updateProfile: async (updates) => {
    try {
      const response = await api.put('/api/auth/profile', updates);
      return response.data;
    } catch (error) {
      throw new Error('Profile update failed: ' + error.message);
    }
  }
}; 