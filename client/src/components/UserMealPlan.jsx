import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
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
import api from '../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const UserMealPlan = forwardRef(({ userId }, ref) => {
  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMealTypes, setSelectedMealTypes] = useState(['breakfast', 'lunch', 'dinner']);
  const [dateRange, setDateRange] = useState('all'); // 'week', 'month', 'all'
  const [stats, setStats] = useState({
    averageCalories: 0,
    averageProtein: 0,
    averageCarbs: 0,
    averageFat: 0,
    totalMeals: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper function to get correct image URL
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://meal-planner-app-3m20.onrender.com'
      : 'http://localhost:5000';
    return `${baseUrl}${imageUrl}`;
  };

  const fetchMealPlans = async () => {
    if (!userId) return;
    
    try {
      setIsRefreshing(true);
      const response = await api.get(`/api/meal-plans/user-meal-plans/${userId}`);
      setMealPlans(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching meal plans:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Expose the refresh function to parent components
  useImperativeHandle(ref, () => ({
    refresh: fetchMealPlans
  }));

  useEffect(() => {
    if (userId) {
      fetchMealPlans();
    }
  }, [userId]);

  // Calculate summary statistics whenever meal plans or filters change
  useEffect(() => {
    if (!mealPlans.length) return;

    const mealData = [];
    mealPlans.forEach(plan => {
      Object.entries(plan.dates).forEach(([dateStr, dateData]) => {
        Object.entries(dateData.meals).forEach(([mealType, meal]) => {
          if (meal.plannedMacros && selectedMealTypes.includes(mealType)) {
            const mealDate = new Date(dateStr);
            
            // Apply date range filter
            if (dateRange === 'week' && mealDate < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) return;
            if (dateRange === 'month' && mealDate < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) return;
            
            mealData.push({
              calories: meal.plannedMacros.calories,
              protein: meal.plannedMacros.protein_g,
              carbs: meal.plannedMacros.carbs_g,
              fat: meal.plannedMacros.fat_g
            });
          }
        });
      });
    });

    if (mealData.length > 0) {
      setStats({
        averageCalories: Math.round(mealData.reduce((sum, m) => sum + m.calories, 0) / mealData.length),
        averageProtein: Math.round(mealData.reduce((sum, m) => sum + m.protein, 0) / mealData.length),
        averageCarbs: Math.round(mealData.reduce((sum, m) => sum + m.carbs, 0) / mealData.length),
        averageFat: Math.round(mealData.reduce((sum, m) => sum + m.fat, 0) / mealData.length),
        totalMeals: mealData.length
      });
    }
  }, [mealPlans, selectedMealTypes, dateRange]);

  const prepareChartData = () => {
    if (!mealPlans.length) return null;

    const mealData = [];
    
    mealPlans.forEach(plan => {
      Object.entries(plan.dates).forEach(([dateStr, dateData]) => {
        Object.entries(dateData.meals).forEach(([mealType, meal]) => {
          if (meal.plannedMacros && selectedMealTypes.includes(mealType)) {
            const mealDate = new Date(dateStr);
            
            // Apply date range filter
            if (dateRange === 'week' && mealDate < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) return;
            if (dateRange === 'month' && mealDate < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) return;
            
            mealData.push({
              date: mealDate,
              mealType,
              macros: meal.plannedMacros,
              recipeName: meal.recipe.name
            });
          }
        });
      });
    });

    // Sort by date
    mealData.sort((a, b) => a.date - b.date);

    // Format dates for display
    const labels = mealData.map(data => 
      `${data.date.toLocaleDateString()} - ${data.mealType}\n${data.recipeName}`
    );

    return {
      labels,
      datasets: [
        {
          label: 'Calories',
          data: mealData.map(data => data.macros.calories),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          yAxisID: 'y-calories',
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: 'Protein (g)',
          data: mealData.map(data => data.macros.protein_g),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y-macros',
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: 'Carbs (g)',
          data: mealData.map(data => data.macros.carbs_g),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          yAxisID: 'y-macros',
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: 'Fat (g)',
          data: mealData.map(data => data.macros.fat_g),
          borderColor: 'rgb(255, 206, 86)',
          backgroundColor: 'rgba(255, 206, 86, 0.5)',
          yAxisID: 'y-macros',
          pointRadius: 6,
          pointHoverRadius: 8
        }
      ]
    };
  };

  const chartOptions = {
    plugins: {
      title: {
        display: true,
        text: 'Meal Plan Macros by Meal',
        color: 'white',
        font: {
          size: 16
        }
      },
      legend: {
        position: 'bottom',
        labels: {
          color: 'white',
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        callbacks: {
          label: function(context) {
            const value = context.raw;
            const metric = context.dataset.label;
            return `${metric}: ${value}`;
          }
        }
      }
    },
    maintainAspectRatio: false,
    aspectRatio: 1.5,
    responsive: true,
    scales: {
      x: {
        ticks: {
          color: 'white',
          maxRotation: 45,
          minRotation: 45,
          callback: function(value, index) {
            return this.getLabelForValue(value).split('\n')[0];
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      'y-calories': {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Calories',
          color: 'white'
        },
        ticks: {
          color: 'white'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      'y-macros': {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Grams',
          color: 'white'
        },
        ticks: {
          color: 'white'
        },
        grid: {
          drawOnChartArea: false,
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 rounded-lg bg-red-100/10">
        Error: {error}
      </div>
    );
  }

  const chartData = prepareChartData();
  if (!chartData) {
    return (
      <div className="text-gray-400 p-4 text-center">
        No meal plan data available.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col  bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)] space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meal Plan Report Card</h2>
        <button
          onClick={fetchMealPlans}
          disabled={isRefreshing}
          className="p-2 hover:bg-[#374151] rounded-lg transition-colors duration-200 disabled:opacity-50"
          title="Refresh meal plan history"
        >
          <svg
            className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        {/* Meal Type Filters */}
        <div className="flex gap-2">
          {['breakfast', 'lunch', 'dinner'].map(mealType => (
            <button
              key={mealType}
              onClick={() => setSelectedMealTypes(prev => 
                prev.includes(mealType) 
                  ? prev.filter(t => t !== mealType)
                  : [...prev, mealType]
              )}
              className={`px-3 py-1 rounded-full text-sm capitalize ${
                selectedMealTypes.includes(mealType)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {mealType}
            </button>
          ))}
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-2">
          {[
            { value: 'week', label: 'Last Week' },
            { value: 'month', label: 'Last Month' },
            { value: 'all', label: 'All Time' }
          ].map(range => (
            <button
              key={range.value}
              onClick={() => setDateRange(range.value)}
              className={`px-3 py-1 rounded-full text-sm ${
                dateRange === range.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-[#2A3142] rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm">Total Meals</div>
          <div className="text-2xl font-bold text-white">{stats.totalMeals}</div>
        </div>
        <div className="bg-[#2A3142] rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm">Avg. Calories</div>
          <div className="text-2xl font-bold text-[rgb(75,192,192)]">{stats.averageCalories}</div>
        </div>
        <div className="bg-[#2A3142] rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm">Avg. Protein</div>
          <div className="text-2xl font-bold text-[rgb(255,99,132)]">{stats.averageProtein}g</div>
        </div>
        <div className="bg-[#2A3142] rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm">Avg. Carbs</div>
          <div className="text-2xl font-bold text-[rgb(54,162,235)]">{stats.averageCarbs}g</div>
        </div>
        <div className="bg-[#2A3142] rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm">Avg. Fat</div>
          <div className="text-2xl font-bold text-[rgb(255,206,86)]">{stats.averageFat}g</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full">
      <div className="w-full h-full">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
});

export default UserMealPlan; 