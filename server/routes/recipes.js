const express = require('express');
const router = express.Router();
const db = require('../services/database');
const socialSharing = require('../services/socialSharing');
const TogetherAiService = require('../services/togetherAiService');
const imageStorage = require('../utils/imageStorage');
const { Pool } = require('pg');

const togetherAiService = new TogetherAiService();
const pool = new Pool();

// GET /api/recipes - Get all recipes
router.get('/', async (req, res) => {
  try {
    // First get all recipes with ratings as before
    const query = `
      SELECT r.*, 
             COALESCE(AVG(rr.rating), 0) as average_rating,
             COUNT(rr.rating) as rating_count
      FROM recipes r
      LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    console.log('Executing main recipes query:', query);
    const result = await db.query(query);
    console.log('Main recipes result:', result.rows);

    let recipes = result.rows;

    // Only process the last 3 recipes for image generation
    if (process.env.TOGETHER_API_KEY) {
      try {
        // Process recent recipes for image generation
        recipes = await togetherAiService.processRecentRecipes(recipes, 3);
        
        // Save any generated images
        recipes = await imageStorage.processGeneratedImages(recipes);

        // Update database with new image URLs
        for (const recipe of recipes) {
          if (recipe.image_url) {
            await db.query(
              'UPDATE recipes SET image_url = $1 WHERE id = $2',
              [recipe.image_url, recipe.id]
            );
          }
        }
      } catch (error) {
        console.error('Image generation process failed:', error);
        // Continue with regular recipe data even if image generation fails
      }
    }

    res.json(recipes);
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
    const { name, difficulty, prepTime, ingredients, instructions } = req.body;
    const result = await db.query(
      `INSERT INTO recipes (name, difficulty, prep_time, ingredients, instructions) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [name, difficulty, prepTime, JSON.stringify(ingredients), instructions]
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

// Get a random meal of the day with image
router.get('/meal-of-day', async (req, res) => {
  try {
    const query = `
      SELECT r.*, 
             COALESCE(AVG(rr.rating), 0) as average_rating,
             COUNT(rr.rating) as rating_count
      FROM recipes r
      LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
      WHERE r.image_url LIKE '/uploads/recipes/%'
      GROUP BY r.id
      ORDER BY RANDOM()
      LIMIT 1
    `;
    console.log('Executing query:', query);
    const result = await db.query(query);
    console.log('Query result:', result.rows);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No meals with images found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching meal of the day:', error);
    res.status(500).json({ error: 'Failed to fetch meal of the day' });
  }
});

// Get a random meal of the day
router.get('/random-meal', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        name,
        description,
        prep_time,
        calories,
        image_url,
        cuisine_type,
        meal_type
      FROM recipes 
      WHERE image_url IS NOT NULL 
        AND cuisine_type IS NOT NULL 
        AND meal_type IS NOT NULL
      ORDER BY RANDOM() 
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No meals found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching random meal:', error);
    res.status(500).json({ error: 'Failed to fetch random meal' });
  }
});

module.exports = router; 