const express = require('express');
const router = express.Router();

router.get('/scraper-test', async (req, res) => {
  const testQueries = ['chicken', 'milk', 'bread'];
  const results = {};

  for (const query of testQueries) {
    try {
      const response = await fetch(`http://localhost:3000/api/search?q=${query}`);
      const data = await response.json();
      results[query] = data;
    } catch (error) {
      results[query] = { error: error.message };
    }
  }

  res.json(results);
});

module.exports = router; 