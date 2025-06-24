import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const DailyCalories = ({ 
  formData = { targetCalories: 2000 }, 
  handleChange = () => {}, 
  mealPlan, 
  isFormMode = false,
  stravaActivities = [],
  fitbitActivities = []
}) => {
  const [activityCalories, setActivityCalories] = useState(0);
  const [calorieStats, setCalorieStats] = useState({
    meals: 0,
    fitbit: 0,
    strava: 0,
    totalBurned: 0,
    target: 2000,
    net: 0,
    balance: 0
  });

  // Calculate total activity calories whenever activities change
  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Sum up Strava calories for today
    const stravaCalories = stravaActivities
      .filter(activity => new Date(activity.start_date) >= todayStart)
      .reduce((sum, activity) => sum + (activity.calories || 0), 0);

    // Sum up Fitbit calories for today
    const fitbitCalories = fitbitActivities
      .filter(activity => new Date(activity.startTime) >= todayStart)
      .reduce((sum, activity) => sum + (activity.calories || 0), 0);

    const totalActivityCalories = stravaCalories + fitbitCalories;
    
    if (totalActivityCalories > 0) {
      console.log('Daily activity calories:', {
        strava: stravaCalories,
        fitbit: fitbitCalories,
        total: totalActivityCalories
      });
      setActivityCalories(totalActivityCalories);
    }
  }, [stravaActivities, fitbitActivities]);

  // Calculate calorie stats whenever activities or meal plan changes
  useEffect(() => {
    const meals = mealPlan?.dailyCalorieTotals?.[0] || 0;
    const fitbit = fitbitActivities[0]?.calories || 0;
    const strava = stravaActivities[0]?.calories || 0;
    const totalBurned = fitbit + strava;
    const target = formData.targetCalories || 2000;
    const net = meals - totalBurned;
    const balance = target - meals;

    setCalorieStats({
      meals,
      fitbit,
      strava,
      totalBurned,
      target,
      net,
      balance
    });

    console.log('Daily activity calories:', {
      strava,
      fitbit,
      total: totalBurned
    });
  }, [stravaActivities, fitbitActivities, mealPlan, formData.targetCalories]);

  // Only log when we have actual meal plan data
  useEffect(() => {
    if (mealPlan?.dailyCalorieTotals?.length > 0) {
      console.log('DailyCalories: Updating with new calorie totals:', mealPlan.dailyCalorieTotals);
    }
  }, [mealPlan?.dailyCalorieTotals]);

  // Define goal calorie levels
  const goals = {
    maintain: 2000,
    lose: 1800,
    gain: 2300
  };

  // Set default target
  const currentTarget = formData.targetCalories || goals.maintain;

  // Default x-axis labels
  const defaultLabels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];
  
  // Create dataset for the chart
  const data = {
    labels: defaultLabels,
    datasets: [
      {
        label: 'Target',
        data: new Array(defaultLabels.length).fill(currentTarget),
        borderColor: currentTarget === goals.maintain ? '#10b981' : // green for maintain
                    currentTarget === goals.lose ? '#ef4444' :      // red for lose
                    '#f59e0b',                                      // yellow for gain
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
        fill: false
      }
    ]
  };

  // Add Strava calories dataset if we have any
  if (stravaActivities.length > 0 && stravaActivities[0].calories > 0) {
    data.datasets.push({
      label: 'Strava',
      data: [stravaActivities[0].calories, ...new Array(defaultLabels.length - 1).fill(null)],
      borderColor: '#FC4C02', // Strava orange
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
  if (fitbitActivities.length > 0 && fitbitActivities[0].calories > 0) {
    data.datasets.push({
      label: 'Fitbit',
      data: [fitbitActivities[0].calories, ...new Array(defaultLabels.length - 1).fill(null)],
      borderColor: '#00B0B9', // Fitbit blue
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

  // Only add daily calories dataset if we have meal plan data and not in form mode
  if (!isFormMode && mealPlan?.dailyCalorieTotals?.length > 0) {
    data.datasets.unshift({
      label: 'Meals',
      data: mealPlan.dailyCalorieTotals,
      borderColor: '#3b82f6', // blue-500
      backgroundColor: '#3b82f6',
      borderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointStyle: 'circle',
      pointBackgroundColor: '#fff',
      pointBorderColor: '#3b82f6',
      pointBorderWidth: 2,
      tension: 0.1,
      fill: false
    });
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        grid: { color: '#2A3142' },
        border: { display: false },
        ticks: { 
          color: '#9ca3af',
          callback: (value) => `${value} cal`,
          font: {
            size: 11
          }
        },
        min: 0,
        max: Math.max(2500, currentTarget * 1.2, activityCalories * 1.2, ...(mealPlan?.dailyCalorieTotals || []))
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { 
          color: '#9ca3af',
          font: {
            size: 11
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        backgroundColor: '#1E2433',
        titleColor: '#9ca3af',
        bodyColor: '#fff',
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

  const getCurrentGoal = () => {
    return Object.keys(goals).find(key => goals[key] === currentTarget) || 'maintain';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full">
      {/* Left Column - Chart */}
      <div className="h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Daily Calories</h3>
          <select 
            className="bg-[#2A3142] text-sm rounded-lg px-3 py-1.5 border-none focus:ring-1 focus:ring-blue-500"
            onChange={(e) => handleChange('targetCalories', goals[e.target.value])}
            value={getCurrentGoal()}
          >
            <option value="maintain">Maintain Weight</option>
            <option value="lose">Lose Weight (-200 cal)</option>
            <option value="gain">Gain Muscle (+300 cal)</option>
          </select>
        </div>
        
        {/* Chart */}
        <div className="h-[300px]">
          <Line data={data} options={options} />
        </div>
      </div>

      {/* Right Column - Summary */}
      <div className="h-full">
        {/* Calorie Summary Section */}
        {(calorieStats.meals > 0 || calorieStats.totalBurned > 0) && (
          <div className="space-y-4 h-full">
            {/* Summary Text */}
            <div className="bg-[#1E2433] rounded-lg p-4 border border-[#ffffff0f]">
              <p className="text-gray-300 text-sm leading-relaxed">
                <span className="font-bold text-white">Daily Summary:</span> You consumed{' '}
                <span className="text-blue-400">{calorieStats.meals} cal</span> and burned{' '}
                <span className="text-green-400">{calorieStats.totalBurned} cal</span>{' '}
                ({calorieStats.fitbit > 0 && <span>{calorieStats.fitbit} Fitbit</span>}
                {calorieStats.fitbit > 0 && calorieStats.strava > 0 && ' + '}
                {calorieStats.strava > 0 && <span>{calorieStats.strava} Strava</span>}), resulting in a{' '}
                <span className={`${calorieStats.net < 0 ? 'text-red-400' : 'text-yellow-400'} font-medium`}>
                  {calorieStats.net < 0 ? 'Deficit' : 'Surplus'} of {Math.abs(calorieStats.net)} cal
                </span> for Day 1.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (calorieStats.meals / calorieStats.target) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-right">
                Meals: {((calorieStats.meals / calorieStats.target) * 100).toFixed(0)}% of target
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-[#ffffff0a] rounded-lg p-3">
                <p className="text-xs text-gray-400">Meals</p>
                <p className="text-lg font-medium text-blue-400">{calorieStats.meals} cal</p>
              </div>
              <div className="bg-[#ffffff0a] rounded-lg p-3">
                <p className="text-xs text-gray-400">Burned</p>
                <p className="text-lg font-medium text-green-400">{calorieStats.totalBurned} cal</p>
              </div>
              <div className="bg-[#ffffff0a] rounded-lg p-3">
                <p className="text-xs text-gray-400">Net</p>
                <p className={`text-lg font-medium ${calorieStats.net < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {calorieStats.net} cal
                </p>
              </div>
              <div className="bg-[#ffffff0a] rounded-lg p-3">
                <p className="text-xs text-gray-400">Target Balance</p>
                <p className="text-lg font-medium text-purple-400">{calorieStats.balance} cal</p>
              </div>
            </div>

            {/* Insight Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-blue-400 text-xl">💡</span>
                <div>
                  <p className="text-sm text-blue-400 font-medium">Daily Insight</p>
                  <p className="text-sm text-gray-300 mt-1">
                    {calorieStats.net < 0 ? (
                      <>You're in a {Math.abs(calorieStats.net)} cal deficit today. This may lead to ~{(Math.abs(calorieStats.net) / 3500 * 1).toFixed(2)} lbs weight loss if maintained.</>
                    ) : (
                      <>You're in a {calorieStats.net} cal surplus today. Consider {calorieStats.net > 500 ? 'increasing' : 'maintaining'} your activity level to meet your goals.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyCalories; 