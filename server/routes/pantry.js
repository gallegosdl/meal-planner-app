const express = require('express');
const router = express.Router();
const PantryItem = require('../models/PantryItem');
const { authenticateToken } = require('../middleware/auth');

// Get all pantry items for the authenticated user, grouped by category
router.get('/', authenticateToken, async (req, res) => {
  try {
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

module.exports = router; 