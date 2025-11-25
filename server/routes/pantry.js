const express = require('express');
const router = express.Router();
const PantryItem = require('../models/PantryItem');
const { authenticateToken } = require('./auth');
const sequelize = require('../db/config');
const { Op } = require('sequelize');

// In routes/pantry.js
console.log('pantry.js loaded');

// Helper to convert user_id to appropriate format for database
const formatUserId = (userId) => {
  console.log('🔍 formatUserId called with userId:', userId, 'type:', typeof userId);
  // If userId is already a string that looks like UUID, return it
  if (typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return userId;
  }
  // If it's an integer, we need to handle it - but UUID columns can't accept integers
  // So we'll return it as-is and let Sequelize handle the conversion
  // The database will reject it if it's not a valid UUID
  return userId;
};

// Helper to create user_id where clause with type casting for UUID/INTEGER mismatch
const getUserWhereClause = (userId) => {
  console.log('🔍 getUserWhereClause called with userId:', userId, 'type:', typeof userId);
  // Cast user_id to TEXT to handle UUID/INTEGER mismatch
  return sequelize.where(
    sequelize.cast(sequelize.col('PantryItem.user_id'), 'TEXT'),
    sequelize.cast(userId, 'TEXT')
  );
};

// Get all pantry items for the authenticated user, grouped by category
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('GET /api/pantry handler, user:', req.user);
    console.log('🔍 Querying pantry with user_id:', req.user.id, 'type:', typeof req.user.id);
    const items = await PantryItem.findAll({
      where: getUserWhereClause(req.user.id),
      order: [['item_name', 'ASC']]
    });
    console.log('✅ Found', items.length, 'pantry items');

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
    console.log('🔍 Creating pantry item with user_id:', req.user.id, 'type:', typeof req.user.id);
    const formattedUserId = formatUserId(req.user.id);
    console.log('🔍 Formatted user_id:', formattedUserId, 'type:', typeof formattedUserId);
    const newItem = await PantryItem.create({
      user_id: formattedUserId,
      item_name,
      quantity,
      category
    });
    console.log('✅ Created pantry item:', newItem.id);

    // Fetch and return updated list
    const items = await PantryItem.findAll({
      where: getUserWhereClause(req.user.id),
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
      where: {
        id,
        [Op.and]: [getUserWhereClause(req.user.id)]
      }
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
      where: {
        id,
        [Op.and]: [getUserWhereClause(req.user.id)]
      }
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
      where: getUserWhereClause(req.user.id)
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
          console.log('🔍 Creating new pantry item:', newItem.item_name, 'user_id:', req.user.id);
          const formattedUserId = formatUserId(req.user.id);
          const createdItem = await PantryItem.create({
            user_id: formattedUserId,
            item_name: newItem.item_name,
            quantity: newItem.quantity || 1,
            category: newItem.category
          });
          createdItems.push(createdItem);
        }
    }

    // Fetch and return updated list
    const allItems = await PantryItem.findAll({
      where: getUserWhereClause(req.user.id),
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
      where: getUserWhereClause(req.user.id)
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
          console.log('🔍 Creating new pantry item (bulk-smart):', newItem.item_name, 'user_id:', req.user.id);
          const formattedUserId = formatUserId(req.user.id);
          console.log('🔍 Formatted user_id for bulk-smart:', formattedUserId, 'type:', typeof formattedUserId);
          const createdItem = await PantryItem.create({
            user_id: formattedUserId,
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
      where: getUserWhereClause(req.user.id),
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