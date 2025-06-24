import React, { useState } from 'react';
import { StarIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const Recipe = ({ recipe }) => {
  const [rating, setRating] = useState(recipe.average_rating || 0);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRate = async (newRating) => {
    try {
      await api.post(`/api/recipes/${recipe.id}/rate`, { rating: newRating });
      setRating(newRating);
    } catch (error) {
      console.error('Failed to rate recipe:', error);
    }
  };

  const handleShare = async () => {
    try {
      const response = await api.post(`/api/recipes/${recipe.id}/share`);
      if (response.data.success) {
        toast.success('Recipe shared to X!', {
          duration: 3000,
          style: {
            background: '#1a1f2b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        });
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error sharing recipe:', error);
      toast.error('Failed to share recipe. Please try again.', {
        duration: 3000,
        style: {
          background: '#1a1f2b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      });
    }
  };

  return (
    <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] transition-all duration-300 hover:border-blue-500/30">
      <div className="flex justify-between items-start">
        <h2 className="text-2xl font-bold mb-4 text-white">{recipe.name}</h2>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ChevronDownIcon className={`h-6 w-6 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      <div className="flex justify-between mb-4 text-gray-300">
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
      <div className="flex items-center space-x-1 mb-4">
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

      {/* Expandable Content */}
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {/* Ingredients */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Ingredients</h3>
          <ul className="space-y-2 text-gray-300">
            {recipe.ingredients?.map((ing, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>{ing.name} - {ing.amount}</span>
                {ing.notes && <span className="text-gray-400 ml-2">({ing.notes})</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Instructions</h3>
          <div className="text-gray-300 space-y-4">
            {recipe.instructions?.split('\n').map((step, idx) => (
              <p key={idx} className="leading-relaxed">{step}</p>
            ))}
          </div>
        </div>

        {/* Plating Instructions */}
        {/*recipe.plating && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Plating</h3>
            <p className="text-gray-300 italic">{recipe.plating}</p>
          </div>
        )}*/}
      </div>

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#2A3142] rounded-lg hover:bg-[#313d4f] transition-colors group"
          title="Share to X (Twitter)"
        >
          <svg 
            className="w-5 h-5 text-[#1DA1F2] group-hover:text-white transition-colors" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span className="text-gray-400 group-hover:text-white transition-colors text-sm">Share</span>
        </button>
      </div>
    </div>
  );
};

export default Recipe; 