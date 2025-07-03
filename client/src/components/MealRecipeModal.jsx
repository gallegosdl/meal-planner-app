import React from 'react';

const MealRecipeModal = ({ selectedMeal, onBack }) => {
  if (!selectedMeal?.meal) {
    return null;
  }

  return (
    <>
      {/* Recipe Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {selectedMeal.meal.name}
          </h3>
          <p className="text-blue-400 text-sm font-medium">
            {selectedMeal.mealType.charAt(0).toUpperCase() + selectedMeal.mealType.slice(1)} Recipe
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Recipe Meta Info */}
      <div className="bg-[#1F2937]/50 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-300">
            {selectedMeal.meal.difficulty && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {selectedMeal.meal.difficulty}
              </span>
            )}
            {selectedMeal.meal.prepTime && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {selectedMeal.meal.prepTime}
              </span>
            )}
          </div>
          
          {/* External Links */}
          <div className="flex gap-2">
            {selectedMeal.meal.source_url ? (
              <a
                href={selectedMeal.meal.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-green-500/30 hover:border-green-400"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Original
              </a>
            ) : (
              <button
                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedMeal.meal.name + ' recipe')}`, '_blank')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-green-500/30 hover:border-green-400"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ingredients */}
      {selectedMeal.meal.ingredients && (
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h4 className="text-white font-semibold">Ingredients</h4>
          </div>
          <div className="space-y-2">
            {Array.isArray(selectedMeal.meal.ingredients) ? (
              selectedMeal.meal.ingredients.map((ingredient, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                  <span className="text-gray-300 font-medium">{ingredient.name || ingredient}</span>
                  <span className="text-blue-400 text-sm font-medium">
                    {ingredient.amount || ''}
                    {ingredient.notes && (
                      <span className="ml-2 text-gray-400 italic">({ingredient.notes})</span>
                    )}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400">Ingredients list not available</p>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {selectedMeal.meal.instructions && (
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h4 className="text-white font-semibold">Instructions</h4>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {selectedMeal.meal.instructions}
            </p>
          </div>
        </div>
      )}

      {/* Back to Summary Button */}
      <button
        onClick={onBack}
        className="w-full py-3 px-6 bg-gray-600/20 hover:bg-gray-500/30 text-gray-300 hover:text-white rounded-xl font-medium transition-all duration-200 border border-gray-500/30 hover:border-gray-400 flex items-center justify-center gap-2"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Summary
      </button>
    </>
  );
};

export default MealRecipeModal; 