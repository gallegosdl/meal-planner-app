import React from 'react';
import { Doughnut } from 'react-chartjs-2';

const CuisinePreferences = ({ cuisinePreferences, handleCuisineChange }) => {
  const total = Object.values(cuisinePreferences).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full flex flex-col">
      <h2 className="text-xl font-semibold text-white mb-4">Cuisine Preferences</h2>
      <p className="text-sm text-gray-400 mb-4">
        Adjust the sliders to set your cuisine preferences (total cannot exceed 100%)
      </p>

      {/* Donut Chart */}
      <div className="h-[200px] mb-6">
        <Doughnut 
          data={{
            labels: Object.keys(cuisinePreferences).map(cuisine => 
              cuisine.replace(/([A-Z])/g, ' $1').trim()
            ),
            datasets: [{
              data: Object.values(cuisinePreferences),
              backgroundColor: [
                '#FF6384', // cajun
                '#36A2EB', // creole
                '#FFCE56', // mexican
                '#4BC0C0', // italian
                '#9966FF', // greek
                '#FF9F40', // chinese
                '#EA80FC', // japanese
                '#00E676', // thai
                '#FF5252'  // middleEastern
              ],
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
      <div className="flex-1 space-y-3">
        {Object.entries(cuisinePreferences).map(([cuisine, value]) => (
          <div key={cuisine} className="flex flex-col">
            <div className="flex justify-between mb-1">
              <span className="text-gray-300">{cuisine.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="text-blue-400">{value}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={value}
              onChange={(e) => handleCuisineChange(cuisine, parseInt(e.target.value))}
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

export default CuisinePreferences; 