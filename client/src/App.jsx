import React, { useState } from 'react';
import MealPlannerForm from './components/MealPlannerForm';
import RecipeList from './components/RecipeList';

export default function App() {
  const [activeTab, setActiveTab] = useState('planner'); // 'planner' or 'recipes'
  const [generatedMealPlan, setGeneratedMealPlan] = useState(null);

  const handleMealPlanGenerated = (mealPlan) => {
    setGeneratedMealPlan(mealPlan);
    // Don't auto-switch to recipes tab anymore
    // setActiveTab('recipes');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f2b] to-[#2d3748] text-white">
      {/* Header with Navigation */}
      <div className="bg-[#252B3B]/50 backdrop-blur-sm border-b border-[#ffffff0f]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold">Meal Planner AI</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('planner')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'planner'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Meal Planner
              </button>
              <button
                onClick={() => setActiveTab('recipes')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'recipes'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Recipe Library
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'planner' ? (
          <MealPlannerForm onMealPlanGenerated={handleMealPlanGenerated} />
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-6">Recipe Library</h2>
            <RecipeList />
          </div>
        )}
      </div>
    </div>
  );
}