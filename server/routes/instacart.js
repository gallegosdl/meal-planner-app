const express = require('express');
const axios = require('axios');
const router = express.Router();
const InstacartScraper = require('../services/instacartScraper');

//const INSTACART_API = 'https://connect.instacart.com/idp/v1/products/products_link'; // PRODUCTION
const INSTACART_API = 'https://connect.dev.instacart.tools/idp/v1/products/products_link'; // DEV

// Create Instacart shopping list
router.post('/create-link', async (req, res) => {
  try {
    const {
      title,
      link_type,
      expires_in,
      line_items,
      landing_page_configuration
    } = req.body;

    // Your existing list creation logic here
    // This should match your original implementation
    
    res.json({
      success: true,
      data: {
        url: createdListUrl // From your implementation
      }
    });
  } catch (error) {
    console.error('Failed to create Instacart list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Instacart list'
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