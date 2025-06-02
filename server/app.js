const express = require('express');
const cors = require('cors');
const app = express();
const instacartRoutes = require('./routes/instacart');

// ... other middleware
app.use('/api/instacart', instacartRoutes);

app.use(cors({
  origin: 'https://meal-planner-frontend-woan.onrender.com',
  credentials: true
}));

// ... other imports

module.exports = app; 