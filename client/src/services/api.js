import axios from 'axios';

// Get API URL from environment variables or use localhost as fallback
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Creates ONE reusable axios instance for the entire app
// This ensures consistent configuration and interceptors across all API calls
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'  // Set default content type for all requests
  }
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
const clearSession = () => {
  sessionStorage.removeItem('session_token');
};

// Intercepts ALL requests to add auth token
// This automatically adds the session token to every API request
// Prevents having to manually add token to each request
api.interceptors.request.use((config) => {
  const sessionToken = getSession();
  if (sessionToken) {
    config.headers['x-session-token'] = sessionToken;  // Add token to request headers
  }
  return config;
});

// Centralized auth management with error handling and session management
// Handles the entire authentication flow in one place
export const authenticate = async (apiKey) => {
  try {
    // Clear any existing session before attempting new auth
    // This prevents stale token issues
    clearSession();
    
    // Make the auth request with timestamp to prevent caching
    // Some browsers/networks might cache POST requests
    // Adding timestamp ensures each request is unique
    const response = await api.post('/api/auth', { 
      apiKey,
      timestamp: Date.now() 
    });

    // Validate the response has the expected data structure
    // Ensures we have a valid session token before proceeding
    if (response.data?.sessionToken) {
      // Store the session token for future requests
      // This token will be automatically added to future requests by the interceptor
      setSession(response.data.sessionToken);
      return response.data;
    } else {
      throw new Error('Invalid authentication response');
    }
  } catch (error) {
    // Always clear session on auth failure
    // This prevents invalid tokens from persisting
    clearSession();
    throw error; // Re-throw to be handled by the component
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