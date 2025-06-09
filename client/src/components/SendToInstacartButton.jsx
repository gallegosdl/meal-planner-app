import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import ShoppingListConfirmationModal from './ShoppingListConfirmationModal';

const SendToInstacartButton = ({ mealPlan }) => {
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isCheckingPrices, setIsCheckingPrices] = useState(false);
  const [currentStore, setCurrentStore] = useState(null);
  const [priceData, setPriceData] = useState({});
  const [shoppingListUrl, setShoppingListUrl] = useState(null);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  const stores = [
    "Smith's",
    'Albertsons',
    'Walmart',
    'Sprouts Farmers Market'
  ];

  // Extract all ingredients from meal plan
  const getAllIngredients = () => {
    // Create a map to combine duplicate ingredients
    const ingredientMap = new Map();

    mealPlan.days.forEach(day =>
      Object.values(day.meals).forEach(meal =>
        meal.ingredients.forEach(ing => {
          const amount = parseFloat(ing.amount) || 1;
          const key = ing.name.toLowerCase();
          
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key);
            existing.quantity += amount;
            // Update display text with combined quantity
            existing.display_text = `${ing.name} (${existing.quantity}${ing.unit || 'each'})`;
          } else {
            ingredientMap.set(key, {
              name: ing.name,
              quantity: amount,
              unit: ing.unit || 'each',
              display_text: `${ing.name} (${amount}${ing.unit || 'each'})`
            });
          }
        })
      )
    );

    return Array.from(ingredientMap.values());
  };

  // Create shopping list with filtered ingredients
  const createShoppingList = async (filteredIngredients) => {
    const sessionToken = sessionStorage.getItem('session_token');
    if (!sessionToken) {
      console.log('Client: No session token found');
      toast.error('Please authenticate first');
      return null;
    }

    // Add client-side logging
    console.log('Client: Sending to Instacart:', {
      ingredients: filteredIngredients,
      totalItems: filteredIngredients.length
    });

    try {
      const res = await api.post('/api/instacart/create-link', {
        title: 'Weekly Meal Plan Ingredients',
        link_type: 'shopping_list',
        expires_in: 7,
        line_items: filteredIngredients,
        landing_page_configuration: {
          partner_linkback_url: window.location.origin
        }
      }, {
        headers: {
          'x-session-token': sessionToken
        }
      });

      console.log('Client: Instacart response:', res.data);

      if (res.data?.url) {
        window.open(res.data.url, '_blank');
        setShoppingListUrl(res.data.url);
        return res.data.url;
      } else {
        console.log('Client: No URL in response');
        toast.error('Failed to create Instacart link');
        return null;
      }
    } catch (error) {
      console.error('Client: Shopping list creation error:', error);
      toast.error('Failed to create shopping list');
      return null;
    }
  };

  // Handle opening the confirmation modal
  const handleOpenConfirmation = () => {
    setIsConfirmationModalOpen(true);
  };

  // Handle the final confirmation and list creation
  const handleConfirmShoppingList = async (filteredIngredients) => {
    setIsCreatingList(true);
    try {
      await createShoppingList(filteredIngredients);
      setIsConfirmationModalOpen(false);
      toast.success('Shopping list created!');
    } catch (error) {
      toast.error('Failed to create shopping list');
    } finally {
      setIsCreatingList(false);
    }
  };

  // Then check prices at each store
  const checkStorePrice = async (store) => {
    setIsCheckingPrices(true);
    setCurrentStore(store);
    
    try {
      // Make sure we have a shopping list URL
      if (!shoppingListUrl) {
        console.log('Client: No shopping list URL available');
        toast.error('Please create a shopping list first');
        return;
      }

      console.log(`Client: Scraping prices from "${store}"`);

      const priceResponse = await api.post('/api/instacart/scrape-prices', {
        listUrl: shoppingListUrl,
        store
      });

      console.log(`Client: Price data received for "${store}":`, priceResponse.data);

      setPriceData(prev => ({
        ...prev,
        [store]: priceResponse.data
      }));

      toast.success(`Prices fetched for ${store}`);

    } catch (error) {
      console.error('Client: Price fetch error:', {
        store,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(`Failed to get prices from ${store}`);
    } finally {
      setIsCheckingPrices(false);
      setCurrentStore(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main button */}
      <button
        onClick={handleOpenConfirmation}
        disabled={isCreatingList || isCheckingPrices}
        className="mt-6 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreatingList ? 'Creating List...' : 'Send to Instacart Shopping List'}
      </button>

      {/* Store comparison section */}
      {shoppingListUrl && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Compare Store Prices</h4>
          <div className="flex flex-wrap gap-2">
            {stores.map(store => (
              <button
                key={store}
                onClick={() => checkStorePrice(store)}
                disabled={isCreatingList || (isCheckingPrices && currentStore === store)}
                className={`px-4 py-2 rounded-lg ${
                  isCheckingPrices && currentStore === store
                    ? 'bg-blue-500/50'
                    : priceData[store]
                    ? 'bg-green-500'
                    : 'bg-[#2A3142]'
                } text-white`}
              >
                {isCheckingPrices && currentStore === store ? (
                  <span className="animate-pulse">Checking {store}...</span>
                ) : (
                  <>
                    {store}
                    {priceData[store] && ` - $${priceData[store].total}`}
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Price comparison results */}
          {Object.keys(priceData).length > 0 && (
            <div className="mt-4 bg-[#252B3B]/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Price Comparison</h4>
              {Object.entries(priceData)
                .sort(([,a], [,b]) => a.total - b.total)
                .map(([store, data]) => (
                  <div key={store} className="flex justify-between py-2">
                    <span>{store}</span>
                    <span>${data.total}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ShoppingListConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        ingredients={getAllIngredients()}
        onConfirm={handleConfirmShoppingList}
      />
    </div>
  );
};

export default SendToInstacartButton;
