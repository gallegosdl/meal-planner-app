import React from 'react';
import { Bar } from 'react-chartjs-2';

const DailyCalories = ({ formData, handleChange, calorieData }) => (
  <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-sm text-gray-400">Daily Calories</h3>
      <select 
        className="bg-[#2A3142] text-sm rounded-lg px-3 py-1.5 border-none focus:ring-1 focus:ring-blue-500"
        onChange={(e) => {
          const goals = {
            maintain: 2000,
            lose: 1800,
            gain: 2300
          };
          handleChange('targetCalories', goals[e.target.value]);
        }}
      >
        <option value="maintain">Maintain Weight</option>
        <option value="lose">Lose Weight (-200 cal)</option>
        <option value="gain">Gain Muscle (+300 cal)</option>
      </select>
    </div>
    <div className="h-48">
      <Bar 
        data={calorieData} 
        options={{
          maintainAspectRatio: false,
          scales: {
            y: { 
              grid: { color: '#2A3142' }, 
              border: { display: false },
              ticks: { color: '#9ca3af' }
            },
            x: { 
              grid: { display: false }, 
              border: { display: false },
              ticks: { color: '#9ca3af' }
            }
          },
          plugins: { 
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1E2433',
              titleColor: '#9ca3af',
              bodyColor: '#fff',
              padding: 12,
              cornerRadius: 8
            }
          }
        }} 
      />
    </div>
  </div>
);

export default DailyCalories; 