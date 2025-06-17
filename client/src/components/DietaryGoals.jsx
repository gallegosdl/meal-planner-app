import React from 'react';

const DietaryGoals = ({ dietOptions, formData, toggleDietGoal }) => (
  <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
    <h3 className="text-sm text-gray-400 mb-4">Dietary Goals</h3>
    {Object.entries(dietOptions).map(([category, options]) => (
      <div key={category} className="mb-4">
        <h4 className="text-xs text-gray-500 mb-2">{category}</h4>
        <div className="flex flex-wrap gap-2">
          {options.map((goal) => (
            <button
              key={goal}
              onClick={() => toggleDietGoal(goal)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                formData.dietGoals.includes(goal)
                  ? 'bg-blue-500 text-white'
                  : 'bg-[#2A3142] text-gray-400 hover:bg-[#313748]'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default DietaryGoals; 