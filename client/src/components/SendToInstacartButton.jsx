import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const SendToInstacartButton = ({ mealPlan }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStore, setCurrentStore] = useState(null);
  const [priceData, setPriceData] = useState({});
  const [shoppingListUrl, setShoppingListUrl] = useState(null);

  const stores = ['Smith\'s', 'Albertsons', 'Walmart'];

  // First create the shopping list
  const createShoppingList = async () => {
    const sessionToken = sessionStorage.getItem('session_token');
    if (!sessionToken) {
      console.log('Client: No session token found');
      toast.error('Please authenticate first');
      return null;
    }

    const ingredients = mealPlan.days.flatMap(day =>
      Object.values(day.meals).flatMap(meal =>
        meal.ingredients.map(ing => ({
          name: ing.name,
          quantity: parseFloat(ing.amount) || 1,
          unit: 'each',
          display_text: `${ing.name} (${ing.amount || '1 each'})`
        }))
      )
    );

    // Add client-side logging
    console.log('Client: Sending to Instacart:', {
      ingredients,
      totalItems: ingredients.length
    });

    const res = await api.post('/api/instacart/create-list', {
      items: ingredients
    }, {
      headers: {
        'x-session-token': sessionToken
      }
    });

    console.log('Client: Instacart response:', res.data);

    if (res.data?.url) {
      window.open(res.data.url, '_blank'); // Keep the original behavior
      setShoppingListUrl(res.data.url);
      return res.data.url;
    } else {
      console.log('Client: No URL in response');
      toast.error('Failed to create Instacart link');
      return null;
    }
  };

  // Then check prices at each store
  const checkStorePrice = async (store) => {
    console.log(`Client: Checking prices for ${store}`);
    setIsLoading(true);
    setCurrentStore(store);
    
    try {
      // Make sure we have a shopping list URL
      const listUrl = shoppingListUrl || await createShoppingList();
      if (!listUrl) {
        console.log('Client: No shopping list URL available');
        toast.error('Failed to create shopping list');
        return;
      }

      console.log(`Client: Scraping prices from ${store}`, { listUrl });

      // Now scrape prices for this store
      const priceResponse = await api.post('/api/instacart/scrape-prices', {
        listUrl,
        store
      });

      console.log(`Client: Price data received for ${store}:`, priceResponse.data);

      setPriceData(prev => ({
        ...prev,
        [store]: priceResponse.data
      }));

      toast.success(`Prices fetched for ${store}`);

    } catch (error) {
      console.error('Client: Price fetch error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(`Failed to get prices from ${store}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Original Instacart button */}
      <button
        onClick={createShoppingList}
        disabled={isLoading}
        className="mt-6 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow hover:bg-green-600 transition-all"
      >
        Send to Instacart Shopping List
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
                disabled={isLoading && currentStore === store}
                className={`px-4 py-2 rounded-lg ${
                  isLoading && currentStore === store
                    ? 'bg-blue-500/50'
                    : priceData[store]
                    ? 'bg-green-500'
                    : 'bg-[#2A3142]'
                } text-white`}
              >
                {isLoading && currentStore === store ? (
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
    </div>
  );
};

export default SendToInstacartButton;
