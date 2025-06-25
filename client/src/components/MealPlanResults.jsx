import React, { useEffect, useState } from 'react';
import SendToInstacartButton from './SendToInstacartButton';
import RecipeList from './RecipeList';
import DraggableMealPlan from './DraggableMealPlan';
import CalendarMealPlan from './CalendarMealPlan';

const getDailyTotals = (meals) => {
  const totals = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0
  };

  Object.values(meals).forEach((meal) => {
    if (meal.nutrition) {
      totals.calories += Number(meal.nutrition.calories) || 0;
      totals.protein_g += meal.nutrition.protein_g || 0;
      totals.carbs_g += meal.nutrition.carbs_g || 0;
      totals.fat_g += meal.nutrition.fat_g || 0;
    }
  });

  return totals;
};

const MealPlanResults = ({ 
  mealPlan, 
  viewMode, 
  setViewMode, 
  activeTab, 
  setActiveTab,
  onDailyTotalsCalculated,
  stravaActivities = [],
  fitbitActivities = []
}) => {
  const [imageErrors, setImageErrors] = useState({});
  
  // Calculate and pass up daily totals whenever mealPlan changes
  useEffect(() => {
    if (mealPlan?.days) {
      const dailyCalorieTotals = mealPlan.days.map(day => getDailyTotals(day.meals).calories);
      onDailyTotalsCalculated(dailyCalorieTotals);
    }
  }, [mealPlan, onDailyTotalsCalculated]);

  return (
    <div className="mt-8 space-y-6">
      {/* Header and buttons container */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 className="text-2xl font-bold whitespace-nowrap">Your Meal Plan</h2>
        {/* Controls container */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SendToInstacartButton mealPlan={mealPlan} />
          {/* View Toggle Buttons */}
          <div className="grid grid-cols-2 sm:flex gap-2">
            <button
              onClick={() => setViewMode('tabs')}
              className={`px-4 py-2 rounded-lg text-sm sm:text-base ${
                viewMode === 'tabs' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-[#2A3142] text-gray-400'
              }`}
            >
              Detailed View
            </button>
            <button
              onClick={() => setViewMode('recipes')}
              className={`px-4 py-2 rounded-lg text-sm sm:text-base ${
                viewMode === 'recipes' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-[#2A3142] text-gray-400'
              }`}
            >
              Recipe Library
            </button>
            <button
              onClick={() => setViewMode('tiles')}
              className={`px-4 py-2 rounded-lg text-sm sm:text-base ${
                viewMode === 'tiles' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-[#2A3142] text-gray-400'
              }`}
            >
              Draggable Tiles
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg text-sm sm:text-base ${
                viewMode === 'calendar' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-[#2A3142] text-gray-400'
              }`}
            >
              Calendar View
            </button>
          </div>
        </div>
      </div>

      {/* View content based on selected mode */}
      {viewMode === 'tabs' && (
        <>
          <div className="flex items-center gap-3 border-b border-[#ffffff1a] mb-6">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((dayNum) => (
                <button
                  key={dayNum}
                  onClick={() => setActiveTab(dayNum)}
                  className={`px-4 py-2 -mb-px ${
                    activeTab === dayNum
                      ? 'text-blue-500 border-b-2 border-blue-500 font-medium'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Day {dayNum}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {mealPlan.days.map((day) => (
            <div
              key={day.day}
              className={`${activeTab === day.day ? 'block' : 'hidden'} mb-8`}
            >
              <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
                {/* Day heading and badge with nutrition summary */}
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-3xl font-semibold flex flex-wrap items-center gap-4">
                    Day {day.day}
                    <span className="text-sm font-normal text-gray-400 flex gap-3">
                      <span className="text-blue-400">{getDailyTotals(day.meals).calories} kcal</span>
                      <span className="text-green-400">{getDailyTotals(day.meals).protein_g}g Protein</span>
                      <span className="text-yellow-400">{getDailyTotals(day.meals).carbs_g}g Carbs</span>
                      <span className="text-red-400">{getDailyTotals(day.meals).fat_g}g Fat</span>
                    </span>
                  </h3>
                  {mealPlan.generatedWithPantry && (
                    <span className="inline-block bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium border border-green-500/30 ml-2">
                      🍽️ Generated with {mealPlan.pantryItemCount} Pantry Items
                    </span>
                  )}
                </div>
                {Object.entries(day.meals).map(([mealType, meal]) => (
                  <div key={mealType} className="mb-12 pb-12 border-b border-[#ffffff1a] last:border-0 last:mb-0 last:pb-0">
                    <h4 className="text-2xl font-medium capitalize mb-6">
                      {mealType}: {meal.name}
                    </h4>
                    <div className="flex gap-8">
                      {/* Image on the left */}
                      {meal.image_url && !imageErrors[`${day.day}-${mealType}`] && (
                        <div className="w-1/3">
                          <div className="relative rounded-lg overflow-hidden">
                            <img
                              src={meal.image_url}
                              alt={meal.name}
                              className="rounded-lg"
                              onError={() => setImageErrors(prev => ({ 
                                ...prev, 
                                [`${day.day}-${mealType}`]: true 
                              }))}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Content on the right */}
                      <div className={meal.image_url && !imageErrors[`${day.day}-${mealType}`] ? "w-2/3" : "w-full"}>
                        {meal.nutrition && (
                          <div className="bg-[#2A3142] rounded-lg p-4 mb-6">
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div className="text-blue-400">Calories: {meal.nutrition.calories}</div>
                              <div className="text-green-400">Protein: {meal.nutrition.protein_g}g</div>
                              <div className="text-yellow-400">Carbs: {meal.nutrition.carbs_g}g</div>
                              <div className="text-red-400">Fat: {meal.nutrition.fat_g}g</div>
                            </div>
                          </div>
                        )}
                        <div className="space-y-6">
                          <div>
                            <h5 className="font-medium mb-3">Ingredients:</h5>
                            <ul className="list-disc ml-4 space-y-2">
                              {meal.ingredients.map((ing, i) => (
                                <li key={i}>
                                  {ing.name} - {ing.amount}
                                  {ing.cost && ` ($${ing.cost})`}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-medium mb-3">Instructions:</h5>
                            <p className="ml-4 text-gray-300">{meal.instructions}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      {viewMode === 'recipes' && (
        <RecipeList recipes={mealPlan.recipes} />
      )}
      {viewMode === 'tiles' && (
        <DraggableMealPlan mealPlan={mealPlan} />
      )}
      {viewMode === 'calendar' && (
        <CalendarMealPlan mealPlan={mealPlan} />
      )}
    </div>
  );
};

export default MealPlanResults; 