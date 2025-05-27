
import React from 'react';
import api from '../services/api'; // Axios instance

const InstacartLinkButton = ({ mealPlan }) => {
  const handleCreateInstacartLink = async () => {
    try {
      const ingredients = mealPlan.days.flatMap(day =>
        Object.values(day.meals).flatMap(meal =>
          meal.ingredients.map(ing => ({
            name: ing.name,
            quantity: parseFloat(ing.amount) || 1,
            unit: 'each'
          }))
        )
      );

      const res = await api.post('/api/instacart/create-link', {
        title: 'Weekly Grocery List from Meal Planner AI',
        link_type: 'shopping_list',
        expires_in: 7,
        line_items: ingredients,
        landing_page_configuration: {
          partner_linkback_url: 'https://meal-planner-frontend-woan.onrender.com/'
        }
      });

      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        alert('Instacart link failed');
      }
    } catch (error) {
      console.error('Instacart link error:', error);
      alert('Failed to create Instacart link');
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
