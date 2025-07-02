import React, { useMemo, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import MealOfTheDay from './MealOfTheDay';

const CuisinePreferences = ({ cuisinePreferences, handleCuisineChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const total = useMemo(() => 
    Object.values(cuisinePreferences).reduce((a, b) => a + b, 0),
    [cuisinePreferences]
  );

  const chartData = useMemo(() => ({
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
  }), [cuisinePreferences]);

  const chartOptions = useMemo(() => ({
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
  }), []);

  return (
    <div className="h-full">
      <div className={`bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl border border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)] transition-all duration-300 ${isCollapsed ? 'min-h-[76px] p-4' : 'h-full p-6'}`}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-white">Cuisine Preferences</h2>
            {!isCollapsed && (
              <p className="text-sm text-gray-400 mt-1">
                Adjust the sliders to set your cuisine preferences (total cannot exceed 100%)
              </p>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <svg
              className={`w-5 h-5 transform transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        <div 
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isCollapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-[800px] opacity-100 mt-6'
          }`}
        >
          {/* Donut Chart */}
          <div className="h-[200px] mb-6">
            <Doughnut 
              data={chartData}
              options={chartOptions}
            />
          </div>

          {/* Sliders */}
          <div className="space-y-3">
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
          <div className="flex justify-between mt-12 pt-4 border-t border-[#ffffff1a]">
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
      </div>

      {/* MealOfTheDay container */}
      <div 
        className={`mt-4 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'opacity-100 visible h-[calc(100%-92px)]' : 'opacity-0 invisible h-0 mt-0'
        }`}
      >
        <div className="h-full bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl border border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)] p-6">
          <MealOfTheDay />
        </div>
      </div>
    </div>
  );
};

export default React.memo(CuisinePreferences); 