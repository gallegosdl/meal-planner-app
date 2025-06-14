import React, { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const categories = [
  { label: 'Meat / Poultry / Seafood', value: 'meat' },
  { label: 'Spices', value: 'spices' },
  { label: 'Bread / Grains', value: 'grains' },
  { label: 'Vegetables', value: 'vegetables' }
];

const PantryModal = ({ isOpen, onClose }) => {
  const [pantry, setPantry] = useState({});
  const [newItem, setNewItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('meat');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/pantry')
        .then(res => res.json())
        .then(data => setPantry(data))
        .catch(err => console.error('Failed to load pantry:', err));
    }
  }, [isOpen]);

  const addItem = async () => {
    if (!newItem.trim()) return;

    const response = await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_name: newItem.trim(), quantity, category })
    });

    if (response.ok) {
      const updated = await response.json();
      setPantry(updated);
      setNewItem('');
      setQuantity(1);
      setCategory('meat');
    } else {
      console.error('Failed to add item');
    }
  };

  const updateQuantity = async (id, newQty) => {
    await fetch(`/api/pantry/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQty })
    });
    const res = await fetch('/api/pantry');
    const data = await res.json();
    setPantry(data);
  };

  const deleteItem = async (id) => {
    await fetch(`/api/pantry/${id}`, { method: 'DELETE' });
    const res = await fetch('/api/pantry');
    const data = await res.json();
    setPantry(data);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-3xl w-full bg-gray-800 rounded-xl text-white">
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <Dialog.Title className="text-lg font-bold">Pantry / Inventory</Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-4">
            <div className="flex gap-2 mb-4">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Item name"
                className="p-2 rounded bg-gray-700 w-full"
              />
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-20 p-2 rounded bg-gray-700"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="p-2 rounded bg-gray-700"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <button 
                onClick={addItem} 
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {categories.map(({ label, value }) => (
                <div key={value} className="mb-6">
                  <h3 className="text-md font-semibold mb-2">{label}</h3>
                  {(pantry[value] || []).map(item => (
                    <div key={item.id} className="flex items-center justify-between mb-1 bg-gray-700 p-2 rounded">
                      <span>{item.item_name}</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                          className="px-2 py-1 bg-gray-600 rounded"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                          className="px-2 py-1 bg-gray-600 rounded"
                        >
                          +
                        </button>
                        <button 
                          onClick={() => deleteItem(item.id)} 
                          className="text-red-400 hover:text-red-600"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default PantryModal; 