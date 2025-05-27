import React from 'react';
import api from '../services/api'; // Axios instance

const InstacartLinkButton = ({ mealPlan }) => {
  const handleCreateInstacartLink = async () => {
    try {
      // Get session token
      const sessionToken = sessionStorage.getItem('session_token');
      if (!sessionToken) {
        alert('Please authenticate first');
        return;
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

      const res = await api.post('/api/instacart/create-link', {
        title: 'Weekly Meal Plan Ingredients',
        link_type: 'shopping_list',
        expires_in: 7,
        line_items: ingredients,
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
      } else {
        alert('Failed to create Instacart link');
      }
    } catch (error) {
      console.error('Client: Instacart link error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert('Failed to create Instacart link. Please try again.');
    }
  };

  return (
    <button
      onClick={handleCreateInstacartLink}
      className="mt-6 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow hover:bg-green-600 transition-all"
    >
      Send to Instacart Shopping List
    </button>
  );
};

export default InstacartLinkButton;
