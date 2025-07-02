import React, { useState, useEffect } from 'react';
import api from '../services/api';

const getImageUrl = (imageUrl) => {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://meal-planner-app-3m20.onrender.com'
    : '';
  return `${baseUrl}${imageUrl}`;
};

const MealOfTheDay = () => {
  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMeal = async () => {
      try {
        const response = await api.get('/api/recipes/meal-of-day');
        setMeal(response.data);
      } catch (err) {
        setError('Failed to load meal of the day');
        console.error('Error loading meal:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeal();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className="w-full h-full bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-gray-400">
        <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm">{error || 'No meal of the day available'}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden">
      <img 
        src={getImageUrl(meal.image_url)}
        alt={meal.name}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <div className="p-6">
          <h3 className="text-2xl font-semibold text-white mb-2">{meal.name}</h3>
          <p className="text-gray-300 mb-4">A delicious meal</p>
          <div className="flex items-center gap-6 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {meal.prep_time || "20"} min prep, {meal.cook_time || "15"} min cooking
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {meal.calories || "500"} cal
            </div>
          </div>
          <button 
            className="mt-4 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            View Recipe
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealOfTheDay;