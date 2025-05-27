const express = require('express');
const router = express.Router();
const db = require('../services/database');

// GET /api/recipes - Get all recipes
router.get('/', async (req, res) => {
  try {
    const recipes = await db.query('SELECT * FROM recipes');
    res.json(recipes);
  } catch (error) {
    console.error('Failed to fetch recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// POST /api/recipes - Save a new recipe
router.post('/', async (req, res) => {
  try {
    const { name, difficulty, prepTime, ingredients, instructions, plating } = req.body;
    const result = await db.query(
      'INSERT INTO recipes (name, difficulty, prep_time, ingredients, instructions, plating) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, difficulty, prepTime, JSON.stringify(ingredients), instructions, plating]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to save recipe:', error);
    res.status(500).json({ error: 'Failed to save recipe' });
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

module.exports = router; 