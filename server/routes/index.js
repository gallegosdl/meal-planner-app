// routes/index.js
const express = require('express');
const router = express.Router();

router.use('/', require('./parseIntentRoutes'));

module.exports = router;