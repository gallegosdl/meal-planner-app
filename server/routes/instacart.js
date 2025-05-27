const express = require('express');
const axios = require('axios');
const router = express.Router();

//const INSTACART_API = 'https://connect.instacart.com/idp/v1/products/products_link'; // PRODUCTION
const INSTACART_API = 'https://connect.dev.instacart.tools/idp/v1/products/products_link'; // DEV
const INSTACART_KEY = process.env.INSTACART_API_KEY;

router.post('/create-link', async (req, res) => {
  try {
    const response = await axios.post(INSTACART_API, req.body, {
      headers: {
        'Authorization': `Bearer ${INSTACART_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ url: response.data.products_link_url });
  } catch (error) {
    console.error('Instacart create-link error:', {
      message: error.message,
      response: error.response?.data
    });

    res.status(error.response?.status || 500).json({
      error: 'Failed to create shopping link',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;