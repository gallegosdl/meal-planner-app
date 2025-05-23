import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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

// Update interceptor to use session token
api.interceptors.request.use((config) => {
  const sessionToken = getSession();
  if (sessionToken) {
    config.headers['x-session-token'] = sessionToken;
  }
  return config;
});

// Auth function
export const authenticate = async (apiKey) => {
  try {
    const response = await api.post('/api/auth', { apiKey });
    setSession(response.data.sessionToken);
    return response.data;
  } catch (error) {
    clearSession();
    throw error;
  }
};

export default api; 

export const generateMealPlan = async (data) => {
  const response = await api.post('/api/generate-meal-plan', data);
  return response.data;
}; 