import React from 'react';
import api from '../services/api'; // Ensure this is your axios instance

const SendToInstacartButton = ({ mealPlan, selectedRetailer = 'albertsons' }) => {
  const handleSendToInstacart = async () => {
    try {
      // Collect unique ingredients from meal plan
      const ingredients = Array.from(new Set(
        mealPlan.days.flatMap(day =>
          Object.values(day.meals).flatMap(meal =>
            meal.ingredients.map(ing => ing.name.toLowerCase().trim())
          )
        )
      ));

      console.log('Matching ingredients:', ingredients);

      // Match ingredients to products
      const matchedItems = [];
      for (const ingredient of ingredients) {
        try {
          const res = await api.post('/api/instacart/search-product', {
            query: ingredient,
            retailerId: selectedRetailer
          });

          if (res.data?.productId) {
            matchedItems.push({
              product_id: res.data.productId,
              quantity: 1
            });
          }
        } catch (err) {
          console.warn(`No match found for: ${ingredient}`);
        }
      }

      if (!matchedItems.length) {
        alert('No items could be matched to Instacart products.');
        return;
      }

      // Create Instacart cart
      const cartRes = await api.post('/api/instacart/create-cart', {
        retailerId: selectedRetailer,
        items: matchedItems
      });

      const cartId = cartRes.data.cartId;
      if (!cartId) {
        throw new Error('Cart creation failed');
      }

      // Request checkout URL
      const checkoutRes = await api.post('/api/instacart/checkout', {
        cartId
      });

      const checkoutUrl = checkoutRes.data.checkoutUrl;
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank');
      } else {
        alert('Checkout URL could not be retrieved.');
      }
    } catch (error) {
      console.error('Instacart flow failed:', error);
      alert('Something went wrong while sending items to Instacart.');
    }
  };

  return (
    <button
      onClick={handleSendToInstacart}
      className="mt-6 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow hover:bg-green-600 transition-all"
    >
      Add Ingredients to Instacart
    </button>
  );
};

export default SendToInstacartButton;