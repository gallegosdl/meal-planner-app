import React, { useState, useEffect } from 'react';
import { XMarkIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { PANTRY_ITEMS, FRESH_CATEGORIES } from '../config/pantryConfig';
import api from '../services/api';

// Helper function to categorize ingredients using shared config
const categorizeIngredient = (name) => {
  if (!name || typeof name !== 'string') {
    return 'OTHER';
  }
  
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
  const [userPantryItems, setUserPantryItems] = useState(new Set());

  // Fetch user's pantry items and pre-select them
  useEffect(() => {
    if (isOpen) {
      api.get('/api/pantry')
        .then(res => {
          // Extract all pantry item names and normalize them
          const pantryItems = new Set(
            Object.values(res.data)
              .flat()
              .map(item => item.item_name ? item.item_name.toLowerCase() : '')
              .filter(name => name !== '')
          );
          setUserPantryItems(pantryItems);
          
          // Pre-check items that exist in user's pantry
          const preCheckedItems = new Set(
            ingredients
              .filter(ing => ing.name && pantryItems.has(ing.name.toLowerCase()))
              .map(ing => ing.name)
          );
          setCheckedItems(preCheckedItems);
        })
        .catch(err => {
          console.error('Error fetching user pantry:', err);
        });
    }
  }, [isOpen, ingredients]);

  // Categorize ingredients when they change
  useEffect(() => {
    if (!ingredients) return;

    const categorized = ingredients.reduce((acc, ingredient) => {
      // Skip ingredients without names
      if (!ingredient.name) {
        console.warn('Skipping ingredient without name:', ingredient);
        return acc;
      }
      
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
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.display_text && item.display_text.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      if (filteredItems.length > 0) {
        filtered[category] = filteredItems;
      }
    });
    return filtered;
  };

  // Handle touch events for better mobile interaction
  const handleTouchStart = (e) => {
    e.preventDefault(); // Prevent unwanted touch behaviors
  };

  if (!isOpen) return null;

  const filteredIngredients = getFilteredIngredients();
  const totalItems = ingredients?.length || 0;
  const checkedCount = checkedItems.size;
  const toBuyCount = totalItems - checkedCount;

  const IngredientItem = ({ ingredient, checked, onToggle }) => (
    <label
      className="flex items-center space-x-3 p-2 hover:bg-[#374151] rounded-lg cursor-pointer group touch-manipulation"
    >
      <div className="min-w-[24px] md:min-w-[28px]">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-5 w-5 md:h-6 md:w-6 text-blue-500 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 bg-[#374151] border-gray-500"
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm md:text-base">
            {ingredient.display_text || ingredient.name}
          </span>
          {ingredient.name && userPantryItems.has(ingredient.name.toLowerCase()) && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              In Pantry
            </span>
          )}
        </div>
        {ingredient.macros && (
          <div className="text-xs text-gray-400 mt-1">
            <span className="mr-2">P: {ingredient.macros.protein}g</span>
            <span className="mr-2">C: {ingredient.macros.carbs}g</span>
            <span>F: {ingredient.macros.fat}g</span>
          </div>
        )}
      </div>
      <span className={`text-xs md:text-sm ${checked ? 'text-green-400' : 'text-blue-400'} hidden md:block md:opacity-0 group-hover:opacity-100 transition-opacity`}>
        {checked ? 'Have in pantry' : 'Need to buy'}
      </span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto md:overflow-y-hidden">
      <div className="flex items-center justify-center min-h-screen px-2 md:px-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black opacity-30 touch-none" 
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-[#1F2937] rounded-lg w-full max-w-2xl p-3 md:p-6 shadow-xl mx-2 my-4 md:my-0 md:mx-auto">
          <div className="flex justify-between items-start mb-4 md:mb-6">
            <div className="pr-2">
              <h2 className="text-lg md:text-xl font-semibold text-white">
                Confirm Shopping List
              </h2>
              <p className="text-xs md:text-sm text-gray-400 mt-1">
              ✓ Items detected in your pantry are pre-selected
              </p>
              <p className="text-xs md:text-sm text-gray-400">
                Unchecked items will be added to your shopping list
              </p>
              <div className="mt-2 flex flex-col md:flex-row gap-2 md:gap-4">
                <span className="text-xs md:text-sm text-blue-400">
                  To Buy: {toBuyCount} items
                </span>
                <span className="text-xs md:text-sm text-green-400">
                  In Pantry: {checkedCount} items
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 p-2 touch-manipulation"
            >
              <XMarkIcon className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </div>

          {/* Search bar */}
          <div className="mb-4 relative">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search ingredients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 md:py-3 bg-[#374151] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm md:text-base"
              />
            </div>
          </div>

          {/* Ingredients list */}
          <div className="max-h-[50vh] md:max-h-[60vh] overflow-y-auto mb-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {Object.entries(filteredIngredients).map(([category, items]) => (
              <div key={category} className="border border-[#374151] rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex justify-between items-center p-3 bg-[#374151] text-white hover:bg-[#4B5563] touch-manipulation"
                >
                  <span className="font-medium text-sm md:text-base">{category}</span>
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-xs md:text-sm text-gray-400">
                      {items.length} items
                    </span>
                    <ChevronDownIcon
                      className={`h-4 w-4 md:h-5 md:w-5 transform transition-transform ${
                        expandedCategories.has(category) ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
                
                {expandedCategories.has(category) && (
                  <div className="p-2 space-y-1">
                    {items.map((ingredient) => (
                      <IngredientItem
                        key={`${ingredient.name}-${ingredient.display_text}`}
                        ingredient={ingredient}
                        checked={checkedItems.has(ingredient.name)}
                        onToggle={() => handleToggleItem(ingredient)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="sticky bottom-0 bg-[#1F2937] pt-2 pb-1 md:pt-4 md:pb-0">
            <div className="flex items-center justify-between">
              <p className="text-m text-gray-400">
                Unchecked items will be added to your pantry after sending to Instacart.
              </p>
              <div className="flex space-x-2 md:space-x-3">
                <button
                  onClick={onClose}
                  className="px-3 py-2 md:px-4 md:py-2 text-white text-sm md:text-base hover:bg-[#374151] rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 touch-manipulation min-w-[80px] md:min-w-[100px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-3 py-2 md:px-4 md:py-2 bg-blue-500 text-white text-sm md:text-base rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation min-w-[140px] md:min-w-[180px]"
                >
                  Create List ({toBuyCount})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListConfirmationModal; 