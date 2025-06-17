import React from 'react';

const MealsPerWeek = ({ formData, handleMealsChange }) => (
  <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full">
    <h3 className="text-sm text-gray-400 mb-4">Meals Per Week</h3>
    <div className="space-y-3">
      {['breakfast', 'lunch', 'dinner'].map(meal => (
        <div key={meal} className="flex items-center justify-between bg-[#2A3142] p-3 rounded">
          <span className="capitalize">{meal}</span>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 bg-[#313748] rounded" onClick={() => handleMealsChange(meal, Math.max(0, formData.mealsPerWeek[meal] - 1))}>-</button>
            <span className="w-8 text-center">{formData.mealsPerWeek[meal]}</span>
            <button className="w-8 h-8 bg-[#313748] rounded" onClick={() => handleMealsChange(meal, Math.min(7, formData.mealsPerWeek[meal] + 1))}>+</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default MealsPerWeek; 