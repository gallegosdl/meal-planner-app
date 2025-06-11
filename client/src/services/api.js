import axios from 'axios';

// Get API URL from environment variables or use localhost as fallback
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Creates ONE reusable axios instance for the entire app
// This ensures consistent configuration and interceptors across all API calls
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'  // Set default content type for all requests
  },
  withCredentials: true
});

// Store session token in browser's sessionStorage
// sessionStorage persists until browser tab is closed
const setSession = (token) => {
  sessionStorage.setItem('session_token', token);
};

// Get session token from sessionStorage
// Returns null if no token exists
const getSession = () => {
  return sessionStorage.getItem('session_token');
};

// Clear session token from sessionStorage
// Used during logout or when auth fails
export const clearSession = () => {
  sessionStorage.removeItem('session_token');
};

// Intercepts ALL requests to add auth token
// This automatically adds the session token to every API request
// Prevents having to manually add token to each request
api.interceptors.request.use((config) => {
  const token = getSession();
  if (token) {
    config.headers['x-session-token'] = token;
  }
  return config;
});

// Centralized auth management with error handling and session management
// Handles the entire authentication flow in one place
export const authenticate = async (apiKey) => {
  try {
    const response = await api.post('/api/auth', { apiKey });
    
    if (response.data.sessionToken) {
      setSession(response.data.sessionToken);
      return { success: true };
    } else {
      throw new Error('No session token received');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    clearSession();
    throw error;
  }
};

// Add validation function to check if current session is valid
export const validateSession = async () => {
  try {
    const token = getSession();
    if (!token) {
      return { valid: false };
    }

    const response = await api.post('/api/auth/validate', null, {
      headers: {
        'x-session-token': token
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Session validation error:', error);
    clearSession();
    return { valid: false };
  }
};

// Export the configured axios instance
// This allows other parts of the app to use the same configured instance
export default api; // Single instance exported

// Helper function to generate meal plans
// Encapsulates the meal plan generation API call
export const generateMealPlan = async (data) => {
  const response = await api.post('/api/generate-meal-plan', data);
  return response.data;
};

export const generateOpenAIMealPlan = async (preferences) => {
  const response = await api.post('/api/generate-openai-plan', preferences);
  return response.data;
};

export const searchFatSecretRecipes = async (preferences) => {
  const response = await api.post('/api/search-fatsecret-recipes', preferences);
  return response.data;
};

export const compareMealPlans = async (preferences) => {
  const response = await api.post('/api/compare-meal-plans', preferences);
  return response.data;
}; 