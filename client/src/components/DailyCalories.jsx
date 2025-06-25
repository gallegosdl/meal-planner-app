import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import VoiceMicButton from './VoiceMicButton';

const DailyCalories = React.memo(({ 
  formData: { targetCalories = 2000 }, 
  handleChange = () => {}, 
  mealPlan, 
  isFormMode = false,
  stravaActivities = [],
  fitbitActivities = []
}) => {
  // Define goal calorie levels
  const goals = useMemo(() => ({
    maintain: 2000,
    lose: 1800,
    gain: 2300
  }), []);

  // Handle goal selection change
  const handleGoalChange = useCallback((e) => {
    const newGoal = e.target.value;
    const newTargetCalories = goals[newGoal];
    // Update parent component's visualData
    handleChange('targetCalories', newTargetCalories);
  }, [handleChange, goals]);

  // Get current goal based on target calories
  const getCurrentGoal = useCallback(() => {
    return Object.entries(goals).find(([_, value]) => value === targetCalories)?.[0] || 'maintain';
  }, [goals, targetCalories]);

  const [calorieStats, setCalorieStats] = useState({
    meals: 0,
    fitbit: 0,
    strava: 0,
    totalBurned: 0,
    target: targetCalories,
    net: 0,
    balance: 0
  });

  // Update calorieStats when targetCalories changes
  useEffect(() => {
    setCalorieStats(prev => ({
      ...prev,
      target: targetCalories,
      balance: targetCalories - prev.meals
    }));
  }, [targetCalories]);

  // Memoize activity calculations
  const activityCalories = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const stravaCalories = stravaActivities
      .filter(activity => new Date(activity.start_date) >= todayStart)
      .reduce((sum, activity) => sum + (activity.calories || 0), 0);

    const fitbitCalories = fitbitActivities
      .filter(activity => new Date(activity.startTime) >= todayStart)
      .reduce((sum, activity) => sum + (activity.calories || 0), 0);

    return {
      strava: stravaCalories,
      fitbit: fitbitCalories,
      total: stravaCalories + fitbitCalories
    };
  }, [stravaActivities, fitbitActivities]);

  // Update calorie stats when activities or meal plan changes
  useEffect(() => {
    const meals = mealPlan?.dailyCalorieTotals?.[0] || 0;
    const { strava, fitbit, total: totalBurned } = activityCalories;
    const net = meals - totalBurned;
    const balance = targetCalories - meals;

    setCalorieStats(prev => {
      const newStats = {
        meals,
        fitbit,
        strava,
        totalBurned,
        target: targetCalories,
        net,
        balance
      };
      
      return JSON.stringify(prev) === JSON.stringify(newStats) ? prev : newStats;
    });
  }, [mealPlan?.dailyCalorieTotals, activityCalories, targetCalories]);

  // Default x-axis labels
  const defaultLabels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];
  
  // Memoize chart data
  const data = useMemo(() => {
    const datasets = [
      {
        label: 'Target',
        data: new Array(defaultLabels.length).fill(targetCalories),
        borderColor: targetCalories === goals.maintain ? '#10b981' : 
                    targetCalories === goals.lose ? '#ef4444' : 
                    '#f59e0b',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
        fill: false
      }
    ];

    // Add Strava calories dataset if we have any
    if (activityCalories.strava > 0) {
      datasets.push({
        label: 'Strava',
        data: [activityCalories.strava, ...new Array(defaultLabels.length - 1).fill(null)],
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
      datasets.push({
        label: 'Fitbit',
        data: [activityCalories.fitbit, ...new Array(defaultLabels.length - 1).fill(null)],
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

    // Only add daily calories dataset if we have meal plan data and not in form mode
    if (!isFormMode && mealPlan?.dailyCalorieTotals?.length > 0) {
      datasets.unshift({
        label: 'Meals',
        data: mealPlan.dailyCalorieTotals,
        borderColor: '#3b82f6',
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

    return {
      labels: defaultLabels,
      datasets
    };
  }, [targetCalories, activityCalories, mealPlan?.dailyCalorieTotals, isFormMode, goals.maintain, goals.lose]);

  // Memoize chart options
  const options = useMemo(() => ({
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
        max: Math.max(2500, targetCalories * 1.2, activityCalories.total * 1.2, ...(mealPlan?.dailyCalorieTotals || []))
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
  }), [targetCalories, activityCalories.total, mealPlan?.dailyCalorieTotals]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-transparent h-full flex flex-col justify-between shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]">
    {/*<div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full">*/}
      {/* Left Column - Chart */}
      <div className="h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Daily Calories</h3>
          <select 
            className="bg-[#2A3142] text-sm rounded-lg px-3 py-1.5 border-none focus:ring-1 focus:ring-blue-500"
            onChange={handleGoalChange}
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

        {/* Voice Mic Button */}
        <div className="mt-6 flex items-center gap-3 mb-4">
          <VoiceMicButton onVoiceInput={(text) => console.log('User requested route for:', text)} />
          <p className="text-white text-sm">Speak route preference (e.g., "Find 3-mile walk near me")</p>
        </div>
      </div>

      

      {/* Right Column - Summary */}
      <div className="h-full">
        {/* Calorie Summary Section */}
        {(calorieStats.meals > 0 || calorieStats.totalBurned > 0) ? (
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
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-8 border border-blue-500/20">
              <div className="text-4xl mb-4">🏃‍♂️ 📊</div>
              <h3 className="text-xl font-semibold text-white mb-3">Ready to Start Your Journey?</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Time to turn those goals into reality! Generate your meal plan and connect your fitness trackers to see your daily metrics come to life.
              </p>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Generate a meal plan to track your nutrition</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Connect Fitbit or Strava to log your activities</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Watch your daily metrics transform!</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default DailyCalories; 