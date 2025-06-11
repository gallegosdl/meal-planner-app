import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const InventoryManager = ({ userProfile, onUpdateInventory }) => {
  const [activeStorage, setActiveStorage] = useState('pantry');
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, expiryDate: '' });
  
  const storageLocations = ['pantry', 'refrigerator', 'freezer'];

  const addItemToInventory = (location, item) => {
    const inventory = {...userProfile.inventory};
    inventory[location][item.name] = {
      quantity: item.quantity,
      expiryDate: item.expiryDate,
      dateAdded: new Date().toISOString()
    };
    onUpdateInventory(inventory);
    toast.success(`Added ${item.name} to ${location}`);
  };

  const removeItemFromInventory = (location, itemName) => {
    const inventory = {...userProfile.inventory};
    delete inventory[location][itemName];
    onUpdateInventory(inventory);
    toast.success(`Removed ${itemName} from ${location}`);
  };

  const updateQuantity = (location, itemName, delta) => {
    const inventory = {...userProfile.inventory};
    const currentQty = inventory[location][itemName].quantity;
    if (currentQty + delta <= 0) {
      removeItemFromInventory(location, itemName);
      return;
    }
    inventory[location][itemName].quantity += delta;
    onUpdateInventory(inventory);
  };

  // Group items by expiry date proximity
  const getExpiringItems = (location) => {
    const items = userProfile.inventory[location];
    const now = new Date();
    const grouped = {
      expired: [],
      soonToExpire: [], // within 7 days
      normal: []
    };

    Object.entries(items).forEach(([name, details]) => {
      const expiryDate = new Date(details.expiryDate);
      const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);

      if (daysUntilExpiry < 0) {
        grouped.expired.push({ name, ...details });
      } else if (daysUntilExpiry <= 7) {
        grouped.soonToExpire.push({ name, ...details });
      } else {
        grouped.normal.push({ name, ...details });
      }
    });

    return grouped;
  };

  return (
    <div className="bg-[#1F2937] rounded-lg p-6">
      <Tab.Group>
        <Tab.List className="flex space-x-2 mb-6">
          {storageLocations.map((location) => (
            <Tab
              key={location}
              className={({ selected }) =>
                `px-4 py-2 rounded-lg capitalize ${
                  selected
                    ? 'bg-blue-500 text-white'
                    : 'bg-[#374151] text-gray-400 hover:text-white'
                }`
              }
              onClick={() => setActiveStorage(location)}
            >
              {location}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels>
          {storageLocations.map((location) => (
            <Tab.Panel key={location}>
              {/* Add new item form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addItemToInventory(location, newItem);
                  setNewItem({ name: '', quantity: 1, expiryDate: '' });
                }}
                className="mb-6 flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="flex-1 px-4 py-2 bg-[#374151] rounded-lg text-white"
                />
                <input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
                  className="w-20 px-4 py-2 bg-[#374151] rounded-lg text-white"
                />
                <input
                  type="date"
                  value={newItem.expiryDate}
                  onChange={(e) => setNewItem({...newItem, expiryDate: e.target.value})}
                  className="px-4 py-2 bg-[#374151] rounded-lg text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                >
                  Add
                </button>
              </form>

              {/* Inventory list */}
              {Object.entries(getExpiringItems(location)).map(([group, items]) => (
                items.length > 0 && (
                  <div key={group} className="mb-4">
                    <h3 className="text-sm font-medium mb-2 capitalize">
                      {group.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.name}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            group === 'expired'
                              ? 'bg-red-500/20'
                              : group === 'soonToExpire'
                              ? 'bg-yellow-500/20'
                              : 'bg-[#374151]'
                          }`}
                        >
                          <span className="text-white">{item.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-400">
                              Expires: {new Date(item.expiryDate).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(location, item.name, -1)}
                                className="p-1 hover:bg-[#4B5563] rounded"
                              >
                                <MinusIcon className="h-4 w-4 text-gray-400" />
                              </button>
                              <span className="text-white w-8 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(location, item.name, 1)}
                                className="p-1 hover:bg-[#4B5563] rounded"
                              >
                                <PlusIcon className="h-4 w-4 text-gray-400" />
                              </button>
                              <button
                                onClick={() => removeItemFromInventory(location, item.name)}
                                className="p-1 hover:bg-red-500/20 rounded"
                              >
                                <TrashIcon className="h-4 w-4 text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default InventoryManager; 