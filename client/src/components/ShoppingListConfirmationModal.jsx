import React, { useState, useEffect } from 'react';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { PANTRY_ITEMS, FRESH_CATEGORIES } from '../config/pantryConfig';

// Helper function to categorize ingredients using shared config
const categorizeIngredient = (name) => {
  const lowercaseName = name.toLowerCase();
  
  // First check pantry categories
  for (const [category, items] of Object.entries(PANTRY_ITEMS)) {
    if (items.some(item => lowercaseName.includes(item.toLowerCase()))) {
      return category;
    }
  }

  // Then check fresh/perishable categories
  for (const [category, items] of Object.entries(FRESH_CATEGORIES)) {
    if (items.some(item => lowercaseName.includes(item.toLowerCase()))) {
      return category;
    }
  }

  return 'OTHER';
};

const ShoppingListConfirmationModal = ({ 
  isOpen, 
  onClose, 
  ingredients, 
  onConfirm 
}) => {
  // State for categorized ingredients and checked items
  const [categorizedIngredients, setCategorizedIngredients] = useState({});
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Categorize ingredients when they change
  useEffect(() => {
    if (!ingredients) return;

    const categorized = ingredients.reduce((acc, ingredient) => {
      const category = categorizeIngredient(ingredient.name);
      if (!acc[category]) acc[category] = [];
      acc[category].push(ingredient);
      return acc;
    }, {});

    setCategorizedIngredients(categorized);
    setExpandedCategories(new Set(Object.keys(categorized)));
  }, [ingredients]);

  const handleToggleItem = (ingredient) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(ingredient.name)) {
      newCheckedItems.delete(ingredient.name);
    } else {
      newCheckedItems.add(ingredient.name);
    }
    setCheckedItems(newCheckedItems);
  };

  const handleConfirm = () => {
    // Filter out items that user has (checked items)
    const shoppingList = ingredients.filter(
      ingredient => !checkedItems.has(ingredient.name)
    );
    onConfirm(shoppingList);
  };

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Filter ingredients based on search
  const getFilteredIngredients = () => {
    if (!searchTerm) return categorizedIngredients;

    const filtered = {};
    Object.entries(categorizedIngredients).forEach(([category, items]) => {
      const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.display_text?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filteredItems.length > 0) {
        filtered[category] = filteredItems;
      }
    });
    return filtered;
  };

  if (!isOpen) return null;

  const filteredIngredients = getFilteredIngredients();
  const totalItems = ingredients?.length || 0;
  const checkedCount = checkedItems.size;
  const toBuyCount = totalItems - checkedCount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black opacity-30" 
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-[#1F2937] rounded-lg w-full max-w-2xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Confirm Shopping List
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                ✓ Check items you already have in your pantry
              </p>
              <p className="text-sm text-gray-400">
                Unchecked items will be added to your shopping list
              </p>
              <div className="mt-2 flex gap-4">
                <span className="text-sm text-blue-400">
                  To Buy: {toBuyCount} items
                </span>
                <span className="text-sm text-green-400">
                  In Pantry: {checkedCount} items
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Search bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-[#374151] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Ingredients list by category */}
          <div className="max-h-[60vh] overflow-y-auto mb-4 space-y-2">
            {Object.entries(filteredIngredients).map(([category, items]) => (
              <div key={category} className="border border-[#374151] rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex justify-between items-center p-3 bg-[#374151] text-white hover:bg-[#4B5563]"
                >
                  <span className="font-medium">{category}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">
                      {items.length} items
                    </span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transform transition-transform ${
                        expandedCategories.has(category) ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
                
                {expandedCategories.has(category) && (
                  <div className="p-2 space-y-1">
                    {items.map((ingredient) => (
                      <label
                        key={`${ingredient.name}-${ingredient.display_text}`}
                        className="flex items-center space-x-3 p-2 hover:bg-[#374151] rounded-lg cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={checkedItems.has(ingredient.name)}
                          onChange={() => handleToggleItem(ingredient)}
                          className="h-5 w-5 text-blue-500 rounded focus:ring-blue-500 focus:ring-offset-0 bg-[#374151] border-gray-500"
                        />
                        <span className="text-white flex-1">
                          {ingredient.display_text || ingredient.name}
                        </span>
                        <span className={`text-sm ${checkedItems.has(ingredient.name) ? 'text-green-400' : 'text-blue-400'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          {checkedItems.has(ingredient.name) ? 'Have in pantry' : 'Need to buy'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-white hover:bg-[#374151] rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create Shopping List ({toBuyCount} items)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListConfirmationModal; 