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

// Simpler authentication function
export const authenticate = async (apiKey) => {
  try {
    const response = await api.post('/api/auth', {
      apiKey: apiKey
    });
    
    if (response.data) {
      // Store the API key in localStorage
      localStorage.setItem('openai_api_key', apiKey);
      return response.data;
    }
    throw new Error('Authentication failed');
  } catch (error) {
    localStorage.removeItem('openai_api_key');
    throw error;
  }
};

// Add an interceptor to include the API key in all requests
api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('openai_api_key');
  if (apiKey) {
    config.headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return config;
});

export default api; // Single instance exported

export const generateMealPlan = async (data) => {
  const response = await api.post('/api/generate-meal-plan', data);
  return response.data;
}; 