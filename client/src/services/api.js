import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Creates ONE reusable axios instance for the entire app
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Store session token
const setSession = (token) => {
  sessionStorage.setItem('session_token', token);
};

// Get session token
const getSession = () => {
  return sessionStorage.getItem('session_token');
};

// Clear session
const clearSession = () => {
  sessionStorage.removeItem('session_token');
};

// Intercepts ALL requests to add auth token
api.interceptors.request.use((config) => {
  const sessionToken = getSession();
  if (sessionToken) {
    config.headers['x-session-token'] = sessionToken;
  }
  return config;
});

// Centralized auth management
export const authenticate = async (apiKey) => {
  try {
    // Remove any cached tokens first
    clearSession();
    
    // Make the auth request
    const response = await api.post('/api/auth', { 
      apiKey,
      // Add timestamp to prevent caching
      timestamp: Date.now() 
    });

    if (response.data?.sessionToken) {
      setSession(response.data.sessionToken);
      return response.data;
    } else {
      throw new Error('Invalid authentication response');
    }
  } catch (error) {
    clearSession();
    throw error;
  }
};

export default api; // Single instance exported

export const generateMealPlan = async (data) => {
  const response = await api.post('/api/generate-meal-plan', data);
  return response.data;
}; 