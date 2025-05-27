// Create a complete Express.js backend integration file that fulfills Deliverable 1,
// implementing full Instacart API flow using mock endpoints for:
// - Retailer Lookup by ZIP
// - Product Search
// - Cart Creation
// - Checkout URL Retrieval

const express = require('express');
const router = express.Router();
const axios = require('axios');

require('dotenv').config();

const INSTACART_API_KEY = process.env.INSTACART_API_KEY;

// ==========================
// Retailer Lookup by ZIP
// ==========================
router.get('/retailers/:zip', async (req, res) => {
  const { zip } = req.params;

  try {
    const response = await axios.get(`https://api.instacart.com/locations/${zip}/retailers`, {
      headers: {
        Authorization: `Bearer ${INSTACART_API_KEY}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Retailer lookup failed:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch retailers' });
  }
});

// ==========================
// Product Search by Name
// ==========================
router.post('/search-product', async (req, res) => {
  const { query, retailerId } = req.body;

  try {
    const response = await axios.get(`https://api.instacart.com/retailers/${retailerId}/products`, {
      params: { query },
      headers: {
        Authorization: `Bearer ${INSTACART_API_KEY}`
      }
    });

    const topResult = response.data?.products?.[0];
    if (!topResult) return res.status(404).json({ message: 'No product found' });

    res.json({
      productId: topResult.id,
      name: topResult.name,
      price: topResult.price
    });
  } catch (error) {
    console.error('Product search failed:', error.response?.data || error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ==========================
// Cart Creation
// ==========================
router.post('/create-cart', async (req, res) => {
  const { retailerId, items } = req.body;

  try {
    const cartRes = await axios.post(`https://api.instacart.com/carts`, {
      retailer_id: retailerId,
      line_items: items
    }, {
      headers: {
        Authorization: `Bearer ${INSTACART_API_KEY}`
      }
    });

    res.json({ cartId: cartRes.data.id });
  } catch (error) {
    console.error('Cart creation failed:', error.response?.data || error.message);
    res.status(500).json({ error: 'Cart creation failed' });
  }
});

// ==========================
// Checkout Flow
// ==========================
router.post('/checkout', async (req, res) => {
  const { cartId } = req.body;

  try {
    const checkoutRes = await axios.post(`https://api.instacart.com/carts/${cartId}/checkout`, {}, {
      headers: {
        Authorization: `Bearer ${INSTACART_API_KEY}`
      }
    });

    res.json({ checkoutUrl: checkoutRes.data.checkout_url });
  } catch (error) {
    console.error('Checkout failed:', error.response?.data || error.message);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

module.exports = router;

