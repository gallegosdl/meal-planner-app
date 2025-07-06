import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const RecipeContent = ({ selectedMeal }) => {
  const { themeMode } = useTheme();
  const isDarkMode = themeMode === 'dark';
  const [activeTab, setActiveTab] = useState('ingredients');

  return (
    <div className="flex flex-col h-full">
      {/* Meta Info */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${isDarkMode ? 'bg-yellow-400/10 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-medium">{selectedMeal.meal.difficulty || 'Medium'}</span>
        </div>
        <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${isDarkMode ? 'bg-blue-400/10 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{selectedMeal.meal.prepTime || '25 min'}</span>
        </div>
        <div className="flex-1 flex justify-end">
          {selectedMeal.meal.source_url ? (
            <a
              href={selectedMeal.meal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-green-400/10 text-green-300 hover:bg-green-400/20' 
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Source</span>
            </a>
          ) : (
            <button
              onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedMeal.meal.name + ' recipe')}`, '_blank')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-green-400/10 text-green-300 hover:bg-green-400/20' 
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`flex mb-3 rounded-xl p-1 flex-shrink-0 ${isDarkMode ? 'bg-white/10' : 'bg-gray-100 border border-gray-100 shadow-sm'}`}>
        <button
          onClick={() => setActiveTab('ingredients')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm ${
            activeTab === 'ingredients'
              ? 'bg-green-400 text-white shadow-lg'
              : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
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
              : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Instructions
        </button>
      </div>

      {/* Tab Content */}
      <div className={`rounded-xl p-3 overflow-y-auto flex-1 min-h-0 ${isDarkMode ? 'bg-white/10' : 'bg-gray-100 border'}`}>
        {activeTab === 'ingredients' && selectedMeal.meal.ingredients && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Array.isArray(selectedMeal.meal.ingredients) ? (
              selectedMeal.meal.ingredients.map((ingredient, index) => (
                <div key={index} className={`flex justify-between items-center py-2 px-3 rounded-lg text-sm ${isDarkMode ? 'bg-white/10' : 'bg-white'}`}>
                  <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                    {ingredient.name || ingredient}
                  </span>
                  <div className="text-right ml-3 flex-shrink-0">
                    <span className="text-blue-400 font-semibold">
                      {ingredient.amount || ''}
                    </span>
                    {ingredient.notes && (
                      <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                        {ingredient.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Ingredients list not available</p>
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
                  <div key={index} className={`rounded-lg p-3 border-l-4 border-orange-400 ${isDarkMode ? 'bg-white/10' : 'bg-white'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                      <p className={`leading-relaxed text-sm flex-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
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

const MealRecipeModal = ({ selectedMeal }) => {
  if (!selectedMeal?.meal) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <RecipeContent selectedMeal={selectedMeal} />
    </div>
  );
};

export default MealRecipeModal; 