const express = require('express');
const app = express();
const instacartRoutes = require('./routes/instacart');

// ... other middleware
app.use('/api/instacart', instacartRoutes);

// ... other imports

module.exports = app; 