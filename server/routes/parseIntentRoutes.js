// routes/parseIntentRoutes.js

const express = require('express');
const router = express.Router();
const { parseIntentHandler } = require('../controllers/parseIntentController');

// Middleware to get API key from request
const requireApiKey = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'API key is required' });
  }
  req.apiKey = Buffer.from(token, 'base64').toString();
  next();
};

router.post('/', requireApiKey, parseIntentHandler);

module.exports = router;
