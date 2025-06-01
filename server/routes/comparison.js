const express = require('express');
const router = express.Router();
const InstacartScraper = require('../services/instacartScraper');

router.post('/compare-stores', async (req, res) => {
  try {
    const { shoppingListUrl, stores } = req.body;
    
    const scraper = new InstacartScraper();
    const results = await scraper.scrapePrices(shoppingListUrl, stores);
    
    res.json(results);
  } catch (error) {
    console.error('Store comparison failed:', error);
    res.status(500).json({ error: 'Failed to compare stores' });
  }
});

module.exports = router; 