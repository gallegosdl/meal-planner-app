const express = require('express');
const router = express.Router();
const db = require('../services/database');
const socialSharing = require('../services/socialSharing');

// GET /api/recipes - Get all recipes
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.*, 
             COALESCE(AVG(rr.rating), 0) as average_rating,
             COUNT(rr.rating) as rating_count
      FROM recipes r
      LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch recipes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recipes',
      details: error.message 
    });
  }
});

// POST /api/recipes - Save a new recipe
router.post('/', async (req, res) => {
  try {
    const { name, difficulty, prepTime, ingredients, instructions, plating } = req.body;
    const result = await db.query(
      `INSERT INTO recipes (name, difficulty, prep_time, ingredients, instructions, plating) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, difficulty, prepTime, JSON.stringify(ingredients), instructions, plating]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to save recipe:', error);
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

// POST /api/recipes/:id/rate - Rate a recipe
router.post('/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    await db.query(
      'INSERT INTO recipe_ratings (recipe_id, rating) VALUES ($1, $2)',
      [req.params.id, rating]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to rate recipe:', error);
    res.status(500).json({ error: 'Failed to rate recipe' });
  }
});

// Share recipe to X (Twitter)
router.post('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    // Get recipe from your existing database query
    const recipe = await db.query(
      'SELECT name, difficulty, prep_time FROM recipes WHERE id = $1',
      [id]
    );

    if (recipe.rows.length === 0) {
      return res.json({ success: false, error: 'Recipe not found' });
    }

    const result = await socialSharing.shareRecipe(recipe.rows[0]);
    res.json({ success: result.success, error: result.error });
  } catch (error) {
    console.error('Share error:', error);
    res.json({ success: false, error: 'Failed to share recipe' });
  }
});

module.exports = router; 