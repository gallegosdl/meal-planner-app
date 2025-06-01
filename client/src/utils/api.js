import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for consistent error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    const message = error.response?.data?.error || 'An error occurred';
    // You could integrate with your toast system here
    return Promise.reject(error);
  }
);

export default api; 