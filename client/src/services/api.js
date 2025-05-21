import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to include API key
api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('openai_api_key');
  if (apiKey) {
    config.headers['x-openai-key'] = apiKey;
  }
  return config;
});

export default api; 

export const generateMealPlan = async (data) => {
  const apiKey = localStorage.getItem('openai_api_key');
  const response = await fetch(`${API_URL}/api/generate-meal-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OpenAI-Key': apiKey
    },
    body: JSON.stringify(data),
  });
  return response.json();
}; 