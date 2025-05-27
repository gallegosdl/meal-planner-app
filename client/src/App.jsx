import React from 'react';
import MealPlannerForm from './components/MealPlannerForm';
import RecipeList from './components/RecipeList';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <MealPlannerForm />
    </div>
  );
}