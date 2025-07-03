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

    // Get existing pantry items for the user
    const existingItems = await PantryItem.findAll({
      where: { user_id: req.user.id }
    });

    // Create a map of existing items for quick lookup
    const existingItemsMap = new Map();
    existingItems.forEach(item => {
      const key = item.item_name.toLowerCase().trim();
      existingItemsMap.set(key, item);
    });

    const createdItems = [];
    const updatedItems = [];

    // Process each item
    for (const newItem of items) {
      const itemKey = newItem.item_name.toLowerCase().trim();
      const existingItem = existingItemsMap.get(itemKey);

      if (existingItem) {
        // Item exists - update quantity
        const newQuantity = existingItem.quantity + (newItem.quantity || 1);
        await existingItem.update({ quantity: newQuantity });
        updatedItems.push({
          item_name: existingItem.item_name,
          old_quantity: existingItem.quantity - (newItem.quantity || 1),
          new_quantity: newQuantity,
          added: newItem.quantity || 1
        });
      } else {
        // Item doesn't exist - create new
        const createdItem = await PantryItem.create({
          user_id: req.user.id,
          item_name: newItem.item_name,
          quantity: newItem.quantity || 1,
          category: newItem.category
        });
        createdItems.push(createdItem);
      }
    }

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

    res.json({
      success: true,
      pantryItems: groupedItems,
      summary: {
        created: createdItems.length,
        updated: updatedItems.length,
        total: items.length
      },
      details: {
        created: createdItems.map(item => ({ name: item.item_name, quantity: item.quantity })),
        updated: updatedItems
      }
    });
  } catch (error) {
    console.error('Error in bulk pantry addition:', error);
    res.status(500).json({ error: 'Failed to add bulk pantry items', details: error.message });
  }
});

// Add smart bulk addition endpoint for shopping lists with proper quantities
router.post('/bulk-smart', authenticateToken, async (req, res) => {
  try {
    const { items, source } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }

    console.log(`Processing ${items.length} items from ${source || 'unknown source'}`);

    // Get existing pantry items for the user
    const existingItems = await PantryItem.findAll({
      where: { user_id: req.user.id }
    });

    // Create a map of existing items for quick lookup
    const existingItemsMap = new Map();
    existingItems.forEach(item => {
      const key = item.item_name.toLowerCase().trim();
      existingItemsMap.set(key, item);
    });

    const createdItems = [];
    const updatedItems = [];
    const errors = [];

    // Process each item with better quantity parsing
    for (const newItem of items) {
      try {
        const itemKey = newItem.item_name.toLowerCase().trim();
        const existingItem = existingItemsMap.get(itemKey);

        // Parse quantity from display_text if available, otherwise use quantity field
        let addQuantity = newItem.quantity || 1;
        if (newItem.display_text) {
          const quantityMatch = newItem.display_text.match(/\((\d+(?:\.\d+)?)/);
          if (quantityMatch) {
            addQuantity = Math.max(1, Math.floor(parseFloat(quantityMatch[1])));
          }
        }

        if (existingItem) {
          // Item exists - update quantity
          const newQuantity = existingItem.quantity + addQuantity;
          await existingItem.update({ quantity: newQuantity });
          updatedItems.push({
            item_name: existingItem.item_name,
            old_quantity: existingItem.quantity - addQuantity,
            new_quantity: newQuantity,
            added: addQuantity
          });
        } else {
          // Item doesn't exist - create new
          const createdItem = await PantryItem.create({
            user_id: req.user.id,
            item_name: newItem.item_name,
            quantity: addQuantity,
            category: newItem.category,
            unit: newItem.unit || 'unit'
          });
          createdItems.push(createdItem);
        }
      } catch (itemError) {
        console.error(`Error processing item ${newItem.item_name}:`, itemError);
        errors.push({
          item_name: newItem.item_name,
          error: itemError.message
        });
      }
    }

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

    res.json({
      success: true,
      pantryItems: groupedItems,
      summary: {
        created: createdItems.length,
        updated: updatedItems.length,
        errors: errors.length,
        total: items.length
      },
      details: {
        created: createdItems.map(item => ({ name: item.item_name, quantity: item.quantity })),
        updated: updatedItems,
        errors: errors
      }
    });
  } catch (error) {
    console.error('Error in smart bulk pantry addition:', error);
    res.status(500).json({ error: 'Failed to add smart bulk pantry items', details: error.message });
  }
});

module.exports = router; 