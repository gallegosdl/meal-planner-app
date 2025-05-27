const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/database');

const db = new DatabaseService();

router.get('/', async (req, res) => {
  try {
    const recipes = await db.getAllRecipes();
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

router.post('/:id/rate', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    await db.rateRecipe(req.params.id, rating, comment);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rate recipe' });
  }
}); 