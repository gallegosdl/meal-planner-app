const express = require('express');
const axios = require('axios');
const router = express.Router();
const InstacartScraper = require('../services/instacartScraper');

//const INSTACART_API = 'https://connect.instacart.com/idp/v1/products/products_link'; // PRODUCTION
const INSTACART_API = 'https://connect.dev.instacart.tools/idp/v1/products/products_link'; // DEV

router.post('/create-link', async (req, res) => {
  console.log('Server: Received Instacart request');
  
  const sessionToken = req.headers['x-session-token'];
  if (!sessionToken) {
    console.log('Server: No session token provided');
    return res.status(401).json({ error: 'No session token provided' });
  }

  // Get session to validate user is authenticated
  const session = req.app.get('sessions').get(sessionToken);
  if (!session?.apiKey) {
    console.log('Server: Invalid session');
    return res.status(401).json({ error: 'Invalid session' });
  }

  try {
    // Log the full request and ingredients payload
    console.log('Server: Full request body:', JSON.stringify(req.body, null, 2));
    console.log('Server: Ingredients payload:', {
      totalItems: req.body.line_items?.length || 0,
      items: req.body.line_items?.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        display: item.display_text
      }))
    });

    console.log('Server: Creating Instacart link...');
    const response = await axios.post(INSTACART_API, req.body, {
      headers: {
        'Authorization': `Bearer ${process.env.INSTACART_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Server: Instacart API response:', response.data);
    res.json({ url: response.data.products_link_url });
  } catch (error) {
    console.error('Server: Instacart create-link error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack
    });

    res.status(error.response?.status || 500).json({
      error: 'Failed to create shopping link',
      details: error.response?.data || error.message
    });
  }
});

const createShoppingList = async (mealPlan) => {
  const lineItems = mealPlan.days.flatMap(day =>
    Object.values(day.meals).flatMap(meal =>
      meal.ingredients.map(ingredient => ({
        name: ingredient.name,
        quantity: parseFloat(ingredient.amount) || 1,
        unit: extractUnit(ingredient.amount) || 'each',
        // Add filters to prefer sale items
        filters: {
          // No direct "on sale" filter in API, but we can use store brands 
          brand_filters: ["Signature SELECT", "Great Value", "Simple Truth"],
          // Add any health filters based on diet preferences
          health_filters: [] 
        }
      }))
    )
  );

  const response = await fetch('https://connect.instacart.com/idp/v1/products/products_link', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.INSTACART_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: "Weekly Meal Plan Shopping List",
      line_items: lineItems,
      // Enable pantry items feature to let users exclude items they have
      landing_page_configuration: {
        enable_pantry_items: true,
        partner_linkback_url: process.env.APP_URL
      }
    })
  });

  return response.json();
};

// Single store price scraping
router.post('/scrape-prices', async (req, res) => {
  try {
    const { listUrl, store } = req.body;
    
    const scraper = new InstacartScraper();
    const result = await scraper.scrapeItems();
    
    res.json({
      success: true,
      data: scraper.formatStoreData(result)
    });
  } catch (error) {
    console.error('Price scraping failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to scrape prices' 
    });
  }
});

// Multiple store comparison
router.post('/compare-stores', async (req, res) => {
  try {
    const { shoppingListUrl, stores } = req.body;
    
    const scraper = new InstacartScraper();
    const results = await scraper.scrapePrices(shoppingListUrl, stores);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Store comparison failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to compare stores' 
    });
  }
});

module.exports = router;