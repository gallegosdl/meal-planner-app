//src/components/DailyCaloriesChart.jsx
import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useTheme } from '../contexts/ThemeContext';

const DailyCaloriesChart = ({ 
  targetCalories, 
  goals, 
  handleGoalChange, 
  getCurrentGoal, 
  mealPlanLoading, 
  chartDataCalculation,
  activityCalories 
}) => {
  const { themeMode, currentTheme } = useTheme();

  // Memoize chart data with PROPER meal plan integration
  const data = useMemo(() => {
    const { totals: mealCalories, labels: mealLabels } = chartDataCalculation;

    const chartLabels = mealLabels.length > 0 ? mealLabels : 
                       ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

    // THEME-AWARE COLORS for better visibility - IMPROVED for dark mode
    const targetColor = targetCalories === goals.maintain ? 
                       (themeMode === 'light' ? '#059669' : '#34d399') : // Brighter green for dark mode
                       targetCalories === goals.lose ? 
                       (themeMode === 'light' ? '#dc2626' : '#f87171') : // Brighter red for dark mode
                       (themeMode === 'light' ? '#d97706' : '#fbbf24'); // Brighter yellow for dark mode

    const datasets = [
      {
        label: 'Target',
        data: new Array(chartLabels.length).fill(targetCalories),
        borderColor: targetColor,
        backgroundColor: targetColor,
        borderDash: [5, 5],
        borderWidth: 3, // Increased width for better visibility
        pointRadius: 0,
        tension: 0,
        fill: false
      }
    ];

    // Add actual meal calories if we have data
    if (mealCalories.length > 0) {
      datasets.unshift({
        label: 'Meals',
        data: mealCalories,
        borderColor: themeMode === 'light' ? '#2563eb' : '#60a5fa', // Brighter blue for dark mode
        backgroundColor: themeMode === 'light' ? '#2563eb' : '#60a5fa',
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointStyle: 'circle',
        pointBackgroundColor: '#ffffff', // FIXED: Always white for better visibility
        pointBorderColor: themeMode === 'light' ? '#2563eb' : '#60a5fa',
        pointBorderWidth: 2,
        tension: 0.1,
        fill: false
      });
    }

    //Find the correct index for today's date to plot activities
    const today = new Date();
    const todayLabel = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const todayIndex = chartLabels.findIndex(label => label === todayLabel);
    
    console.log('📊 Chart: Today is', todayLabel, 'found at index', todayIndex, 'in labels:', chartLabels);

    // Add Strava calories dataset if we have any
    if (activityCalories.strava > 0) {
      // Create array with nulls and put Strava calories at the correct index for today
      const stravaData = new Array(chartLabels.length).fill(null);
      if (todayIndex >= 0) {
        stravaData[todayIndex] = activityCalories.strava;
      }

      datasets.push({
        label: 'Strava',
        data: stravaData,
        borderColor: '#FC4C02',
        backgroundColor: '#FC4C02',
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointStyle: 'circle',
        pointBackgroundColor: '#FC4C02',
        pointBorderColor: '#FC4C02',
        pointBorderWidth: 2,
        tension: 0.1,
        fill: false
      });
    }

    // Add Fitbit calories dataset if we have any
    if (activityCalories.fitbit > 0) {
      // Create array with nulls and put Fitbit calories at the correct index for today
      const fitbitData = new Array(chartLabels.length).fill(null);
      if (todayIndex >= 0) {
        fitbitData[todayIndex] = activityCalories.fitbit;
      }

      datasets.push({
        label: 'Fitbit',
        data: fitbitData,
        borderColor: '#00B0B9',
        backgroundColor: '#00B0B9',
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointStyle: 'circle',
        pointBackgroundColor: '#00B0B9',
        pointBorderColor: '#00B0B9',
        pointBorderWidth: 2,
        tension: 0.1,
        fill: false
      });
    }

    return {
      labels: chartLabels,
      datasets
    };
  }, [targetCalories, activityCalories, chartDataCalculation, goals.maintain, goals.lose, themeMode]);

  // Memoize chart options with THEME-AWARE styling
  const options = useMemo(() => {
    const maxCalories = Math.max(
      2500, 
      targetCalories * 1.2, 
      activityCalories.total * 1.2, 
      ...(chartDataCalculation.totals || [])
    );

    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 20,
          bottom: 20
        }
      },
      scales: {
        y: {
          grid: { 
            color: themeMode === 'light' ? '#e5e7eb' : '#374151', // Brighter grid for dark mode
            lineWidth: 1
          },
          border: { display: false },
          ticks: { 
            color: themeMode === 'light' ? '#374151' : '#d1d5db', // Brighter text for dark mode
            callback: (value) => `${value} cal`,
            font: {
              size: 12,
              weight: 500
            }
          },
          min: 0,
          max: maxCalories
        },
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { 
            color: themeMode === 'light' ? '#374151' : '#d1d5db', // Brighter text for dark mode
            font: {
              size: 12,
              weight: 500
            }
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: themeMode === 'light' ? '#374151' : '#f3f4f6', // Much brighter text for dark mode
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20, // Increased padding for better separation
            font: {
              size: 12,
              weight: 500
            },
            boxWidth: 15,
            boxHeight: 15
          }
        },
        tooltip: {
          backgroundColor: themeMode === 'light' ? '#ffffff' : '#1f2937', // Better contrast for dark mode
          titleColor: themeMode === 'light' ? '#374151' : '#f3f4f6',
          bodyColor: themeMode === 'light' ? '#111827' : '#ffffff',
          borderColor: themeMode === 'light' ? '#e5e7eb' : '#4b5563',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.parsed.y} cal`
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    };
  }, [targetCalories, activityCalories.total, chartDataCalculation, currentTheme, themeMode]);

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-semibold ${currentTheme.text.primary}`}>
          Daily Calories {mealPlanLoading && (
            <span className="text-xs text-blue-400 ml-2">Loading meal data...</span>
          )}
        </h3>
        {/* IMPROVED DROPDOWN STYLING */}
        <select 
          className={`text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
            themeMode === 'light' 
              ? 'bg-white border-2 border-gray-300 text-gray-900 hover:border-gray-400' 
              : 'bg-gray-800 border-2 border-gray-600 text-gray-100 hover:border-gray-500'
          }`}
          onChange={handleGoalChange}
          value={getCurrentGoal()}
        >
          <option value="maintain">Maintain Weight</option>
          <option value="lose">Lose Weight (-200 cal)</option>
          <option value="gain">Gain Muscle (+300 cal)</option>
        </select>
      </div>
      
      {/* Chart - EXPANDED HEIGHT */}
      <div className="h-[400px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default DailyCaloriesChart; 