const express = require('express');
const router = express.Router();
const PantryItem = require('../models/PantryItem');
const { authenticateToken } = require('./auth');

// In routes/pantry.js
console.log('pantry.js loaded');

// Get all pantry items for the authenticated user, grouped by category
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('GET /api/pantry handler, user:', req.user);
    const items = await PantryItem.findAll({
      where: { user_id: req.user.id },
      order: [['item_name', 'ASC']]
    });

    // Group items by category
    const groupedItems = items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json(groupedItems);
  } catch (error) {
    console.error('Error fetching pantry items:', error);
    res.status(500).json({ error: 'Failed to fetch pantry items' });
  }
});

// Add a new pantry item
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { item_name, quantity, category } = req.body;
    const newItem = await PantryItem.create({
      user_id: req.user.id,
      item_name,
      quantity,
      category
    });

    // Fetch and return updated list
    const items = await PantryItem.findAll({
      where: { user_id: req.user.id },
      order: [['item_name', 'ASC']]
    });

    const groupedItems = items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json(groupedItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add pantry item' });
  }
});

// Update a pantry item's quantity
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const item = await PantryItem.findOne({
      where: { id, user_id: req.user.id }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await item.update({ quantity });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating pantry item:', error);
    res.status(500).json({ error: 'Failed to update pantry item' });
  }
});

// Delete a pantry item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await PantryItem.findOne({
      where: { id, user_id: req.user.id }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await item.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting pantry item:', error);
    res.status(500).json({ error: 'Failed to delete pantry item' });
  }
});

// Add multiple pantry items
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body; // items is an array of { item_name, quantity, category }
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }
    await Promise.all(items.map(item =>
      PantryItem.create({
        user_id: req.user.id,
        item_name: item.item_name,
        quantity: item.quantity,
        category: item.category
      })
    ));
    // Fetch and return updated list
    const allItems = await PantryItem.findAll({
      where: { user_id: req.user.id },
      order: [['item_name', 'ASC']]
    });
    const groupedItems = allItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
    res.json(groupedItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add bulk pantry items' });
  }
});

module.exports = router; 