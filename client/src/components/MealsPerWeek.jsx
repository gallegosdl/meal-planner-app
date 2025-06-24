import React from 'react';

const MealsPerWeek = ({ formData, handleMealsChange }) => {
  return (
    <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
      <h2 className="text-xl font-semibold text-white mb-4">Meals Per Week</h2>
      <div className="space-y-6">
        {Object.entries(formData.mealsPerWeek).map(([mealType, value]) => (
          <div key={mealType} className="flex items-center justify-between">
            <span className="text-gray-300 capitalize">{mealType}</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleMealsChange(mealType, Math.max(0, value - 1))}
                className="w-8 h-8 flex items-center justify-center bg-[#374151] text-gray-300 rounded-lg hover:bg-[#4B5563] transition-colors"
              >
                -
              </button>
              <span className="text-white w-4 text-center">{value}</span>
              <button
                onClick={() => handleMealsChange(mealType, Math.min(7, value + 1))}
                className="w-8 h-8 flex items-center justify-center bg-[#374151] text-gray-300 rounded-lg hover:bg-[#4B5563] transition-colors"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MealsPerWeek; 