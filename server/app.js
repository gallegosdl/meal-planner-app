const express = require('express');
const cors = require('cors');
const app = express();
const instacartRoutes = require('./routes/instacart');

// CORS configuration should come before other middleware
app.use(cors({
  origin: 'https://meal-planner-frontend-woan.onrender.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'x-session-token',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Methods'
  ]
}));

// Parse JSON bodies
app.use(express.json());

// Your routes
app.use('/api/instacart', instacartRoutes);

// ... other imports

module.exports = app; 