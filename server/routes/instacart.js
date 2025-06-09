const express = require('express');
const axios = require('axios');
const router = express.Router();
const InstacartScraper = require('../services/instacartScraper');
const SCRAPER_CONFIG = InstacartScraper.SCRAPER_CONFIG;
const { isPantryItem, DEFAULT_PANTRY_SETTINGS } = require('../config/pantryConfig');

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
    console.log('Server: Initial ingredients count:', req.body.line_items?.length || 0);

    // Get pantry items from the session or request (these are now items we HAVE in pantry)
    const pantryItems = session.pantryItems || req.body.pantryItems || [];
    console.log('Server: Pantry items to filter out:', pantryItems);

    // Filter shopping list to only include items we need to buy
    if (Array.isArray(req.body.line_items)) {
      const beforeCount = req.body.line_items.length;
      const removedItems = [];
      
      req.body.line_items = req.body.line_items.filter(item => {
        const itemName = item.name.toLowerCase().trim();
        const displayText = (item.display_text || '').toLowerCase().trim();

        // Check if this item is in our pantry (unselected = in pantry)
        const isInPantry = pantryItems.some(pantryItem => {
          const pantryItemLower = pantryItem.toLowerCase().trim();
          // Check for exact matches or matches with common variations
          return itemName === pantryItemLower || 
                 itemName === `${pantryItemLower} (to taste)` ||
                 (displayText && displayText === pantryItemLower);
        });

        // If it's in our pantry, we don't need to buy it
        if (isInPantry) {
          removedItems.push(item);
          console.log(`DEBUG: Removing pantry item from shopping list: name="${item.name}" display="${item.display_text}"`);
          return false;
        }

        // Not in pantry, so we need to buy it
        console.log(`DEBUG: Keeping item in shopping list: name="${item.name}" display="${item.display_text}"`);
        return true;
      });
      
      const afterCount = req.body.line_items.length;
      console.log(`DEBUG: Shopping list filtering complete. Items before: ${beforeCount}, after: ${afterCount}`);
      console.log('DEBUG: Removed items:', removedItems.map(item => item.name));
    }

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
      error: 'Failed to create shopping list',
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

router.post('/compare-prices', async (req, res) => {
  const { shoppingListUrl, stores } = req.body;
  let scraper = null;
  
  try {
    scraper = new InstacartScraper();
    await scraper.initialize();
    const results = await scraper.scrapePrices(shoppingListUrl, stores);
    
    res.json({
      success: true,
      data: results,
      recommendation: `Best value found at ${results.bestValue.name} with ${results.bestValue.availability}% availability at $${results.bestValue.totalPrice}`
    });
  } catch (error) {
    console.error('Compare prices failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (scraper) {
      await scraper.cleanup();
    }
  }
});

router.post('/scrape-prices', async (req, res) => {
  const { listUrl, store } = req.body;
  let scraper = null;
  
  console.log(`\n🔍 Starting price scrape for ${store}`);
  console.log('List URL:', listUrl);
  
  if (!listUrl || !store) {
    return res.status(400).json({
      error: 'Missing required fields',
      details: 'Both listUrl and store are required'
    });
  }

  try {
    scraper = new InstacartScraper();
    await scraper.initialize();
    
    // Navigate to the base list URL
    await scraper.page.goto(listUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    // Wait for content to stabilize
    console.log('\n⏳ Waiting for page content to load...');
    await scraper.page.waitForSelector('body', { timeout: SCRAPER_CONFIG.TIMEOUT });

    // Switch to the desired store using the modal
    await scraper.switchStore(store);

    console.log('\n🛒 Starting item scraping...');
    const priceData = await scraper.scrapeItems();
    
    // Detailed price logging
    console.log('\n📊 Price Data Summary:');
    console.log(`Store: ${store}`);
    console.log(`Total Items: ${priceData.items.length}`);
    console.log(`Total Price: $${priceData.total.toFixed(2)}`);
    console.log('\n📝 Item Details:');
    priceData.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}`);
      console.log(`   Price: $${item.price.toFixed(2)} x ${item.quantity}`);
      console.log(`   Raw Price: ${item.rawPrice}`);
    });
    console.log('\n-------------------');

    res.json({
      ...priceData,
      total: Number(priceData.total.toFixed(2))
    });
  } catch (error) {
    console.error('\n❌ Scraping failed for', store);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    
    try {
      if (scraper?.page) {
        await scraper.page.screenshot({ path: `error-${store}-${Date.now()}.png`, fullPage: true });
      }
    } catch (screenshotError) {
      console.error('Failed to capture error screenshot:', screenshotError.message);
    }

    res.status(500).json({
      error: 'Failed to scrape prices',
      store,
      details: error.message,
      errorType: error.name
    });
  } finally {
    if (scraper) {
      await scraper.cleanup();
    }
  }
});

module.exports = router;