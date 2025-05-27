import React, { useState } from 'react';
import MealPlannerForm from './components/MealPlannerForm';
import RecipeList from './components/RecipeList';

export default function App() {
  const [activeTab, setActiveTab] = useState('planner'); // 'planner' or 'recipes'

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              className={`px-3 py-4 text-sm font-medium ${
                activeTab === 'planner'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('planner')}
            >
              Meal Planner
            </button>
            <button
              className={`px-3 py-4 text-sm font-medium ${
                activeTab === 'recipes'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('recipes')}
            >
              Recipe Library
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'planner' ? <MealPlannerForm /> : <RecipeList />}
      </div>
    </div>
  );
}