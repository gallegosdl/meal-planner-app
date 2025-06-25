import React from 'react';

const DietaryGoals = ({ dietOptions, formData: { dietGoals }, toggleDietGoal }) => (
  <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-transparent h-full flex flex-col justify-between shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]">
  {/*<div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full flex flex-col">*/}
    <h3 className="text-lg font-semibold text-white mb-4">Dietary Goals</h3>
    <div className="flex-1 space-y-6">
      {Object.entries(dietOptions).map(([category, options]) => (
        <div key={category} className="mb-4">
          <h4 className="text-sm text-gray-400 mb-3">{category}</h4>
          <div className="flex flex-wrap gap-2">
            {options.map((goal) => (
              <button
                key={goal}
                onClick={() => toggleDietGoal(goal)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  dietGoals.includes(goal)
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
  </div>
);

export default DietaryGoals; 