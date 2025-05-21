import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Consistent header name
const API_KEY_HEADER = 'x-openai-key';

// Store session token instead of API key
const setSession = (token) => {
  sessionStorage.setItem('session_token', token);
};

// Update interceptor
api.interceptors.request.use((config) => {
  const sessionToken = sessionStorage.getItem('session_token');
  if (sessionToken) {
    config.headers['x-session-token'] = sessionToken;
  }
  return config;
});

// Auth function
export const authenticate = async (apiKey) => {
  const response = await api.post('/api/auth', { apiKey });
  setSession(response.data.sessionToken);
};

export default api; 

export const generateMealPlan = async (data) => {
  const apiKey = localStorage.getItem('openai_api_key');
  const response = await fetch(`${API_URL}/api/generate-meal-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [API_KEY_HEADER]: apiKey
    },
    body: JSON.stringify(data),
  });
  return response.json();
}; 