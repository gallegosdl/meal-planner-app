import React, { useState } from 'react';

const RecipeContent = ({ selectedMeal }) => {
  const [activeTab, setActiveTab] = useState('ingredients');

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex mb-3 bg-white/5 rounded-xl p-1 flex-shrink-0">
        <button
          onClick={() => setActiveTab('ingredients')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm ${
            activeTab === 'ingredients'
              ? 'bg-green-400 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Ingredients
        </button>
        <button
          onClick={() => setActiveTab('instructions')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm ${
            activeTab === 'instructions'
              ? 'bg-orange-400 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Instructions
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white/5 rounded-xl p-3 overflow-y-auto flex-1 min-h-0">
        {activeTab === 'ingredients' && selectedMeal.meal.ingredients && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Array.isArray(selectedMeal.meal.ingredients) ? (
              selectedMeal.meal.ingredients.map((ingredient, index) => (
                <div key={index} className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-lg text-sm">
                  <span className="text-gray-200 font-medium">
                    {ingredient.name || ingredient}
                  </span>
                  <div className="text-right ml-3 flex-shrink-0">
                    <span className="text-blue-400 font-semibold">
                      {ingredient.amount || ''}
                    </span>
                    {ingredient.notes && (
                      <div className="text-gray-400 text-xs italic">
                        {ingredient.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">Ingredients list not available</p>
            )}
          </div>
        )}

        {activeTab === 'instructions' && selectedMeal.meal.instructions && (
          <div className="space-y-3">
            {selectedMeal.meal.instructions
              .split(/(?:\d+\.|\n\d+\.|\.\s*\d+\.|\n)/)
              .filter(step => step.trim())
              .map((step, index) => {
                const cleanStep = step.trim().replace(/^\d+\.\s*/, '');
                if (!cleanStep) return null;
                
                return (
                  <div key={index} className="bg-white/5 rounded-lg p-3 border-l-4 border-orange-400">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                      <p className="text-gray-200 leading-relaxed text-sm flex-1">
                        {cleanStep}
                      </p>
                    </div>
                  </div>
                );
              })
              .filter(Boolean)}
          </div>
        )}
      </div>
    </div>
  );
};

const MealRecipeModal = ({ selectedMeal, onBack }) => {
  if (!selectedMeal?.meal) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Recipe Meta Info - Always Visible */}
      <div className="bg-[#1F2937]/50 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-4 flex-shrink-0">
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
                Source
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

      {/* Tabbed Interface */}
      <div className="flex-1 min-h-0">
        <RecipeContent selectedMeal={selectedMeal} />
      </div>
    </div>
  );
};

export default MealRecipeModal; 