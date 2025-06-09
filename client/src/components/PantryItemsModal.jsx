import React, { useState, useEffect } from 'react';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { PANTRY_ITEMS } from '../config/pantryConfig';

const PantryItemsModal = ({ isOpen, onClose, selectedItems, onUpdatePantryItems }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [checkedItems, setCheckedItems] = useState(new Set(selectedItems));
  const [customItem, setCustomItem] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set(Object.keys(PANTRY_ITEMS)));

  useEffect(() => {
    setCheckedItems(new Set(selectedItems));
  }, [selectedItems]);

  const handleToggleItem = (item) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(item)) {
      newCheckedItems.delete(item);
    } else {
      newCheckedItems.add(item);
    }
    setCheckedItems(newCheckedItems);
  };

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (customItem.trim()) {
      const newCheckedItems = new Set(checkedItems);
      newCheckedItems.add(customItem.trim());
      setCheckedItems(newCheckedItems);
      setCustomItem('');
    }
  };

  const handleSave = () => {
    onUpdatePantryItems(Array.from(checkedItems));
    onClose();
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

  // Filter items based on search term
  const getFilteredItems = () => {
    const results = {};
    Object.entries(PANTRY_ITEMS).forEach(([category, items]) => {
      const filteredCategoryItems = items.filter(item =>
        item.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filteredCategoryItems.length > 0) {
        results[category] = filteredCategoryItems;
      }
    });
    return results;
  };

  const filteredItems = getFilteredItems();

  // Format category name for display
  const formatCategoryName = (category) => {
    return category.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black opacity-30" 
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-[#1F2937] rounded-lg w-full max-w-md p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Pantry Items
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                ✓ Check items you need to buy
              </p>
              <p className="text-sm text-gray-400">
                Leave items unchecked if you have them in your pantry
              </p>
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
              placeholder="Search pantry items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-[#374151] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Add custom item form */}
          <form onSubmit={handleAddCustomItem} className="mb-4 flex gap-2">
            <input
              type="text"
              placeholder="Add custom item to buy..."
              value={customItem}
              onChange={(e) => setCustomItem(e.target.value)}
              className="flex-1 px-4 py-2 bg-[#374151] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add
            </button>
          </form>

          {/* Items list by category */}
          <div className="max-h-96 overflow-y-auto mb-4">
            {Object.entries(filteredItems).map(([category, items]) => (
              <div key={category} className="border border-[#374151] rounded-lg overflow-hidden mb-2">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex justify-between items-center p-3 bg-[#374151] text-white hover:bg-[#4B5563]"
                >
                  <span className="font-medium">{formatCategoryName(category)}</span>
                  <ChevronDownIcon
                    className={`h-5 w-5 transform transition-transform ${
                      expandedCategories.has(category) ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                {expandedCategories.has(category) && (
                  <div className="p-2 space-y-1">
                    {items.map((item) => (
                      <label
                        key={item}
                        className="flex items-center space-x-3 p-2 hover:bg-[#374151] rounded-lg cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={checkedItems.has(item)}
                          onChange={() => handleToggleItem(item)}
                          className="h-5 w-5 text-blue-500 rounded focus:ring-blue-500 focus:ring-offset-0 bg-[#374151] border-gray-500"
                        />
                        <span className="text-white capitalize flex-1">{item}</span>
                        <span className={`text-sm ${checkedItems.has(item) ? 'text-blue-400' : 'text-gray-500'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          {checkedItems.has(item) ? 'Need to buy' : 'In pantry'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Custom items section */}
            {Array.from(checkedItems).map(item => {
              const isCustomItem = !Object.values(PANTRY_ITEMS).flat().includes(item);
              if (isCustomItem) {
                return (
                  <label
                    key={item}
                    className="flex items-center space-x-3 p-2 hover:bg-[#374151] rounded-lg cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => handleToggleItem(item)}
                      className="h-5 w-5 text-blue-500 rounded focus:ring-blue-500 focus:ring-offset-0 bg-[#374151] border-gray-500"
                    />
                    <span className="text-white flex-1">{item}</span>
                    <span className="text-sm text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Need to buy
                    </span>
                  </label>
                );
              }
              return null;
            })}
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
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PantryItemsModal; 