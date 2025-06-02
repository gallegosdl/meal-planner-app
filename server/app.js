const express = require('express');
const cors = require('cors');
const app = express();
const instacartRoutes = require('./routes/instacart');

// Add CORS configuration BEFORE other middleware
app.use(cors({
  origin: 'https://meal-planner-frontend-woan.onrender.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'x-session-token',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Methods'
  ]
}));

// ... other middleware
app.use('/api/instacart', instacartRoutes);

// ... other imports

module.exports = app; 