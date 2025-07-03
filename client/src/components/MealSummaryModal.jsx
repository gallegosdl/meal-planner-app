import React from 'react';
import moment from 'moment';

const MealSummaryModal = ({ 
  selectedMeal, 
  consumedMeals, 
  onClose, 
  onViewRecipe, 
  onMarkConsumed, 
  onEditMealTime 
}) => {
  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {selectedMeal.meal?.name || 'Meal Details'}
          </h3>
          <p className="text-blue-400 text-sm font-medium">
            {selectedMeal.mealType.charAt(0).toUpperCase() + selectedMeal.mealType.slice(1)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Time and Date Info */}
      <div className="bg-[#1F2937]/50 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6">
        <div className="flex items-center gap-3 text-gray-300">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{moment(selectedMeal.start).format('h:mm A')} - {moment(selectedMeal.end).format('h:mm A')}</span>
          </div>
          <div className="text-gray-400">•</div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">{moment(selectedMeal.start).format('MMMM Do, YYYY')}</span>
          </div>
        </div>
      </div>
      
      {/* Nutrition Info */}
      {selectedMeal.plannedMacros && (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl p-4 border border-blue-500/20 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h4 className="text-white font-semibold">Nutrition Info</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-400">{selectedMeal.plannedMacros.calories || 0}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Calories</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{selectedMeal.plannedMacros.protein_g || 0}g</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Protein</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{selectedMeal.plannedMacros.carbs_g || 0}g</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Carbs</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">{selectedMeal.plannedMacros.fat_g || 0}g</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Fat</div>
            </div>
          </div>
        </div>
      )}

      {/* View Recipe Button */}
      {selectedMeal.meal && (
        <button
          onClick={onViewRecipe}
          className="w-full mb-6 py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          View Full Recipe
        </button>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        {/* Consumption Status Button */}
        <button
          onClick={() => onMarkConsumed(selectedMeal.id)}
          className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 ${
            consumedMeals.has(selectedMeal.id)
              ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]'
          }`}
        >
          {consumedMeals.has(selectedMeal.id) ? (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Mark as Not Consumed
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mark as Consumed
            </>
          )}
        </button>

        {/* Quick Time Changes */}
        <div className="bg-[#1F2937]/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-300 font-medium">Quick Time Changes</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {selectedMeal.mealType === 'breakfast' ? (
              <>
                <button onClick={() => onEditMealTime(selectedMeal.id, '7:00 AM')} className="py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-blue-500/30 hover:border-blue-400">7:00 AM</button>
                <button onClick={() => onEditMealTime(selectedMeal.id, '8:00 AM')} className="py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-blue-500/30 hover:border-blue-400">8:00 AM</button>
                <button onClick={() => onEditMealTime(selectedMeal.id, '9:00 AM')} className="py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-blue-500/30 hover:border-blue-400">9:00 AM</button>
              </>
            ) : selectedMeal.mealType === 'lunch' ? (
              <>
                <button onClick={() => onEditMealTime(selectedMeal.id, '11:00 AM')} className="py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-blue-500/30 hover:border-blue-400">11:00 AM</button>
                <button onClick={() => onEditMealTime(selectedMeal.id, '12:00 PM')} className="py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-blue-500/30 hover:border-blue-400">12:00 PM</button>
                <button onClick={() => onEditMealTime(selectedMeal.id, '1:00 PM')} className="py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-blue-500/30 hover:border-blue-400">1:00 PM</button>
              </>
            ) : (
              <>
                <button onClick={() => onEditMealTime(selectedMeal.id, '5:00 PM')} className="py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-blue-500/30 hover:border-blue-400">5:00 PM</button>
                <button onClick={() => onEditMealTime(selectedMeal.id, '6:00 PM')} className="py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-blue-500/30 hover:border-blue-400">6:00 PM</button>
                <button onClick={() => onEditMealTime(selectedMeal.id, '7:00 PM')} className="py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-blue-500/30 hover:border-blue-400">7:00 PM</button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MealSummaryModal; 