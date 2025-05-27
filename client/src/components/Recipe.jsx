import React, { useState } from 'react';
import { StarIcon } from '@heroicons/react/solid';
import api from '../services/api';

const Recipe = ({ recipe }) => {
  const [rating, setRating] = useState(0);

  const handleRate = async (newRating) => {
    try {
      await api.post(`/api/recipes/${recipe.id}/rate`, { rating: newRating });
      setRating(newRating);
    } catch (error) {
      console.error('Failed to rate recipe:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">{recipe.name}</h2>
      
      <div className="flex justify-between mb-4">
        <div>
          <span className="font-semibold">Difficulty:</span> {recipe.difficulty}
        </div>
        <div>
          <span className="font-semibold">Prep Time:</span> {recipe.prepTime}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold mb-2">Nutrition Info:</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>Calories: {recipe.calories}</div>
          <div>Protein: {recipe.protein}g</div>
          <div>Carbs: {recipe.carbs}g</div>
          <div>Fat: {recipe.fat}g</div>
        </div>
      </div>

      {/* Rating UI */}
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`h-5 w-5 cursor-pointer ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
            onClick={() => handleRate(star)}
          />
        ))}
      </div>
    </div>
  );
}; 