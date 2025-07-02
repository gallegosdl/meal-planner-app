// routes/parseIntentRoutes.js

const express = require('express');
const router = express.Router();
const { parseIntentHandler } = require('../controllers/parseIntentController');

router.post('/', parseIntentHandler);

module.exports = router;
