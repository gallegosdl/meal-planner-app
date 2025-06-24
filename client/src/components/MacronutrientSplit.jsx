import React from 'react';
import { Doughnut } from 'react-chartjs-2';

const MacronutrientSplit = ({ formData, handleMacroChange }) => {
  const total = Object.values(formData.macros).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full flex flex-col">
      <h2 className="text-xl font-semibold text-white mb-4">Macronutrient Split</h2>
      <p className="text-sm text-gray-400 mb-4">
        Adjust the sliders to set your macronutrient ratios (total must equal 100%)
      </p>

      {/* Donut Chart */}
      <div className="h-[200px] mb-6">
        <Doughnut 
          data={{
            labels: ['Protein', 'Carbs', 'Fat'],
            datasets: [{
              data: [formData.macros.protein, formData.macros.carbs, formData.macros.fat],
              backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'],
              borderWidth: 0
            }]
          }}
          options={{
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  color: '#9ca3af',
                  font: { size: 11 },
                  padding: 10
                }
              }
            }
          }}
        />
      </div>

      {/* Sliders */}
      <div className="flex-1 space-y-4">
        {Object.entries(formData.macros).map(([macro, value]) => (
          <div key={macro} className="flex flex-col">
            <div className="flex justify-between mb-1">
              <span className="text-gray-300">{macro.charAt(0).toUpperCase() + macro.slice(1)}</span>
              <span className="text-blue-400">{value}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={value}
              onChange={(e) => handleMacroChange(macro, e.target.value)}
              className="w-full h-2 bg-gray-700 rounded-full accent-blue-500"
            />
          </div>
        ))}
      </div>

      {/* Total Display */}
      <div className="flex justify-between mt-4 pt-4 border-t border-[#ffffff1a]">
        <span className="text-gray-300">Total</span>
        <span className={`font-medium ${
          total === 100 
            ? 'text-green-400' 
            : 'text-yellow-400'
        }`}>
          {total}%
        </span>
      </div>
    </div>
  );
};

export default MacronutrientSplit; 