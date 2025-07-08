// client/src/views/MealPlanner.jsx
import React from 'react';
import MealPlannerForm from '../components/MealPlannerForm';
import RecipeList from '../components/RecipeList';

const MealPlanner = ({ activeTab, user, setUser, handleLogout, onMealPlanGenerated }) => {
  return (
    <div className="max-w-7xl mx-auto p-6">
      {activeTab === 'planner' ? (
        <MealPlannerForm 
          onMealPlanGenerated={onMealPlanGenerated}
          user={user}
          setUser={setUser}
          handleLogout={handleLogout}
        />
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-6">Recipe Library</h2>
          <RecipeList />
        </div>
      )}
    </div>
  );
};

export default MealPlanner; 