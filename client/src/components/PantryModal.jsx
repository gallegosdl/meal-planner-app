import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PANTRY_ITEMS } from '../config/pantryConfig';
import api from '../services/api';

const categories = [
  { label: 'Meat / Poultry / Seafood', value: 'meat' },
  { label: 'Spices', value: 'spices' },
  { label: 'Bread / Grains', value: 'grains' },
  { label: 'Vegetables', value: 'vegetables' }
];

// CategorySelectorModal: for bulk adding items from a category
const CategorySelectorModal = ({ isOpen, onClose, categoryLabel, items, onAdd }) => {
  const [selected, setSelected] = useState({});

  useEffect(() => {
    if (isOpen) setSelected({});
  }, [isOpen]);

  const handleQty = (item, delta) => {
    setSelected(prev => {
      const newQty = Math.max(0, (prev[item] || 0) + delta);
      if (newQty === 0) {
        const { [item]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [item]: newQty };
    });
  };

  const handleAdd = () => {
    const itemsToAdd = Object.entries(selected)
      .filter(([_, qty]) => qty > 0)
      .map(([item, qty]) => ({ item_name: item, quantity: qty, category: categoryLabel }));
    onAdd(itemsToAdd);
    onClose();
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#252B3B] rounded-2xl max-w-lg w-full shadow-xl border border-[#ffffff1a] max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-blue-400">Add {categoryLabel}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {items.map(item => (
            <div key={item} className="flex items-center justify-between bg-[#2A3142] rounded-lg px-4 py-2">
              <span className="text-white">{item}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => handleQty(item, -1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">-</button>
                <span className="text-white min-w-[2ch] text-center">{selected[item] || 0}</span>
                <button onClick={() => handleQty(item, 1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-gray-700 flex justify-end">
          <button
            onClick={handleAdd}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg text-white font-medium hover:from-blue-600 hover:to-indigo-600 transition-colors"
            disabled={Object.keys(selected).length === 0}
          >
            Add Selected to Pantry
          </button>
        </div>
      </div>
    </div>
  );
};

const PantryModal = ({ isOpen, onClose }) => {
  const [pantry, setPantry] = useState({});
  const [newItem, setNewItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('meat');
  const [bulkCategory, setBulkCategory] = useState(null); // which category is open for bulk add

  useEffect(() => {
    if (isOpen) {
      console.log('[PantryModal] Fetching pantry from:', api.defaults.baseURL + '/api/pantry');
      api.get('/api/pantry')
        .then(res => {
          console.log('[PantryModal] Pantry data:', res.data);
          setPantry(res.data);
        })
        .catch(err => {
          console.error('[PantryModal] Error fetching pantry:', {
            status: err.response?.status,
            data: err.response?.data,
            headers: err.response?.headers,
            url: err.config?.url,
            baseURL: err.config?.baseURL
          });
        });
    }
  }, [isOpen]);

  const addItem = async () => {
    if (!newItem.trim()) return;
    const response = await api.post('/api/pantry', {
      item_name: newItem.trim(),
      quantity,
      category
    });
    if (response.status === 200) {
      setPantry(response.data);
      setNewItem('');
      setQuantity(1);
      setCategory('meat');
    } else {
      console.error('Failed to add item');
    }
  };

  const addBulkItems = async (items) => {
    await Promise.all(items.map(item =>
      api.post('/api/pantry', item)
    ));
    const res = await api.get('/api/pantry');
    setPantry(res.data);
  };

  const updateQuantity = async (id, newQty) => {
    if (newQty < 0) return;
    await api.patch(`/api/pantry/${id}`, { quantity: newQty });
    const res = await api.get('/api/pantry');
    setPantry(res.data);
  };

  const deleteItem = async (id) => {
    await api.delete(`/api/pantry/${id}`);
    const res = await api.get('/api/pantry');
    setPantry(res.data);
  };

  // Map PANTRY_ITEMS to UI categories (for demo, map 'meat' to a subset)
  const pantryCategoryMap = {
    meat: ['Ground Beef', 'NY Strip', 'Sirloin', 'Chicken Breast', 'Salmon'],
    spices: PANTRY_ITEMS.SPICES_AND_HERBS,
    grains: PANTRY_ITEMS.GRAINS,
    vegetables: ['Carrot', 'Broccoli', 'Spinach', 'Onion', 'Bell Pepper']
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#252B3B] rounded-2xl max-w-3xl w-full shadow-xl border border-[#ffffff1a] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Kitchen Pantry
            </h2>
            <p className="text-gray-400 mt-2 text-sm">
              Manage your pantry inventory and track ingredients
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Add Item Form */}
        <div className="p-6 border-b border-gray-700 bg-[#1a1f2b]">
          <div className="flex gap-3">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Item name"
              className="flex-1 px-4 py-2 bg-[#2A3142] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-24 px-4 py-2 bg-[#2A3142] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-[#2A3142] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <button 
              onClick={addItem}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg text-white font-medium hover:from-blue-600 hover:to-indigo-600 transition-colors"
            >
              Add Item
            </button>
          </div>
        </div>

        {/* Bulk Add by Category */}
        <div className="p-6 border-b border-gray-700 bg-[#23283a]">
          <div className="flex flex-wrap gap-4">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setBulkCategory(cat.value)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow hover:from-blue-700 hover:to-indigo-700 transition-colors"
              >
                Bulk Add {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pantry Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {categories.map(({ label, value }) => (
            <div key={value} className="mb-6 last:mb-0">
              <h3 className="text-lg font-semibold text-white mb-3">{label}</h3>
              <div className="space-y-2">
                {(pantry[value] || []).map(item => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 bg-[#2A3142] rounded-lg border border-[#ffffff1a] group"
                  >
                    <span className="text-white">{item.item_name}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#1a1f2b] rounded-lg px-2">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                          -
                        </button>
                        <span className="text-white min-w-[2ch] text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <button 
                        onClick={() => deleteItem(item.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                {(pantry[value] || []).length === 0 && (
                  <div className="text-gray-400 text-center py-4 bg-[#2A3142] rounded-lg">
                    No items in this category
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CategorySelectorModal for bulk add */}
        {bulkCategory && (
          <CategorySelectorModal
            isOpen={!!bulkCategory}
            onClose={() => setBulkCategory(null)}
            categoryLabel={categories.find(c => c.value === bulkCategory)?.label}
            items={pantryCategoryMap[bulkCategory] || []}
            onAdd={addBulkItems}
          />
        )}
      </div>
    </div>
  );
};

export default PantryModal; 