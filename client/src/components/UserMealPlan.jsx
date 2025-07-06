import React, { useEffect, useState, forwardRef, useImperativeHandle, useContext } from 'react';
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
import { useTheme } from '../contexts/ThemeContext';
import { getCardStyles, getButtonStyles, getTextStyles } from '../utils/styleUtils';
import { THEME_MODES } from '../styles/themes';

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
  const { currentTheme } = useTheme();
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
  const [isMobile, setIsMobile] = useState(false);
  const [showChartView, setShowChartView] = useState(true);
  const [mobileChartDateLimit, setMobileChartDateLimit] = useState('today+2'); // 'today', 'last3', 'today+2'

  // Get current theme mode from document class
  const getCurrentTheme = () => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  };
  const [themeMode, setThemeMode] = useState(getCurrentTheme());

  // Update theme mode when document class changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setThemeMode(getCurrentTheme());
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
      // Reset to chart view when switching to mobile
      if (isMobileDevice) {
        setShowChartView(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Chart data preparation - mobile has date-based filtering options
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

    // Apply mobile chart date limit (mobile only)
    let finalMealData = mealData;
    if (isMobile && showChartView) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      // Filter meals based on their planned date
      switch (mobileChartDateLimit) {
        case 'today':
          const todayString = today.toDateString();
          finalMealData = mealData.filter(meal => {
            const mealDate = new Date(meal.date);
            return mealDate.toDateString() === todayString;
          });
          break;
        case 'last3':
          const twoDaysAgo = new Date(today);
          twoDaysAgo.setDate(today.getDate() - 2);
          finalMealData = mealData.filter(meal => {
            const mealDate = new Date(meal.date);
            mealDate.setHours(0, 0, 0, 0);
            return mealDate >= twoDaysAgo && mealDate <= today;
          });
          break;
        case 'today+2':
          const twoDaysLater = new Date(today);
          twoDaysLater.setDate(today.getDate() + 2);
          finalMealData = mealData.filter(meal => {
            const mealDate = new Date(meal.date);
            mealDate.setHours(0, 0, 0, 0);
            return mealDate >= today && mealDate <= twoDaysLater;
          });
          break;
        default:
          finalMealData = mealData;
          break;
      }
    }

    // Format labels differently for mobile vs desktop
    const labels = finalMealData.map(data => {
      const dateStr = data.date.toLocaleDateString();
      const mealType = data.mealType;
      
      if (isMobile) {
        // Special formatting for TODAY filter - just show meal types
        if (mobileChartDateLimit === 'today') {
          return mealType.charAt(0).toUpperCase() + mealType.slice(1); // "Breakfast", "Lunch", "Dinner"
        }
        // Shorter labels for other mobile filters
        return `${dateStr.split('/').slice(0, 2).join('/')} ${mealType.charAt(0).toUpperCase()}`;
      } else {
        return `${dateStr} ${mealType.charAt(0).toUpperCase()}`;
      }
    });

    return {
      labels,
      datasets: [
        {
          label: 'Calories',
          data: finalMealData.map(data => data.macros.calories),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          yAxisID: 'y-calories',
          pointRadius: isMobile ? 4 : 6,
          pointHoverRadius: isMobile ? 6 : 8,
          borderWidth: isMobile ? 2 : 3,
          tension: 0.4
        },
        {
          label: 'Protein (g)',
          data: finalMealData.map(data => data.macros.protein_g),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y-macros',
          pointRadius: isMobile ? 4 : 6,
          pointHoverRadius: isMobile ? 6 : 8,
          borderWidth: isMobile ? 2 : 3,
          tension: 0.4
        },
        {
          label: 'Carbs (g)',
          data: finalMealData.map(data => data.macros.carbs_g),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          yAxisID: 'y-macros',
          pointRadius: isMobile ? 4 : 6,
          pointHoverRadius: isMobile ? 6 : 8,
          borderWidth: isMobile ? 2 : 3,
          tension: 0.4
        },
        {
          label: 'Fat (g)',
          data: finalMealData.map(data => data.macros.fat_g),
          borderColor: 'rgb(255, 206, 86)',
          backgroundColor: 'rgba(255, 206, 86, 0.5)',
          yAxisID: 'y-macros',
          pointRadius: isMobile ? 4 : 6,
          pointHoverRadius: isMobile ? 6 : 8,
          borderWidth: isMobile ? 2 : 3,
          tension: 0.4
        }
      ]
    };
  };

  const chartOptions = {
    plugins: {
      title: {
        display: true,
        text: isMobile ? 
          `Meal Macros - ${mobileChartDateLimit === 'today' ? 'Today\'s Meal Plan' : 
                           mobileChartDateLimit === 'last3' ? 'Last 3 Days' :
                           mobileChartDateLimit === 'today+2' ? 'Today + 2 Days' : 'All'}` :
          'Meal Plan Macros by Meal',
        color: themeMode === 'dark' ? '#ffffff' : '#1e293b',
        font: {
          size: isMobile ? 14 : 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      legend: {
        position: 'bottom',
        labels: {
          color: themeMode === 'dark' ? '#ffffff' : '#1e293b',
          padding: isMobile ? 10 : 15,
          font: {
            size: isMobile ? 10 : 12
          },
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8
        }
      },
      tooltip: {
        backgroundColor: themeMode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        titleColor: themeMode === 'dark' ? '#ffffff' : '#1e293b',
        bodyColor: themeMode === 'dark' ? '#ffffff' : '#1e293b',
        titleFont: {
          size: isMobile ? 12 : 14
        },
        bodyFont: {
          size: isMobile ? 11 : 12
        },
        padding: 12,
        boxPadding: 6,
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
    aspectRatio: isMobile ? 1.2 : 1.5,
    responsive: true,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      x: {
        ticks: {
          color: themeMode === 'dark' ? '#ffffff' : '#1e293b',
          maxRotation: isMobile ? 60 : 45,
          minRotation: isMobile ? 45 : 45,
          font: {
            size: isMobile ? 9 : 11
          },
          padding: 8
        },
        grid: {
          color: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        }
      },
      'y-calories': {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: !isMobile,
          text: 'Calories',
          color: themeMode === 'dark' ? '#ffffff' : '#1e293b',
          font: {
            size: isMobile ? 10 : 12
          }
        },
        ticks: {
          color: themeMode === 'dark' ? '#ffffff' : '#1e293b',
          font: {
            size: isMobile ? 9 : 11
          },
          padding: 8
        },
        grid: {
          color: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        }
      },
      'y-macros': {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: !isMobile,
          text: 'Grams',
          color: themeMode === 'dark' ? '#ffffff' : '#1e293b',
          font: {
            size: isMobile ? 10 : 12
          }
        },
        ticks: {
          color: themeMode === 'dark' ? '#ffffff' : '#1e293b',
          font: {
            size: isMobile ? 9 : 11
          },
          padding: 8
        },
        grid: {
          drawOnChartArea: false,
          color: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        }
      }
    }
  };

  // Mobile Summary Cards Component
  const MobileSummaryCards = () => (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className={`${themeMode === 'dark' ? 'bg-[#2A3142]' : 'bg-white border border-gray-200'} rounded-lg p-3 text-center`}>
        <div className={`text-xs mb-1 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg. Calories</div>
        <div className="text-lg font-bold text-[rgb(75,192,192)]">{stats.averageCalories}</div>
      </div>
      <div className={`${themeMode === 'dark' ? 'bg-[#2A3142]' : 'bg-white border border-gray-200'} rounded-lg p-3 text-center`}>
        <div className={`text-xs mb-1 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg. Protein</div>
        <div className="text-lg font-bold text-[rgb(255,99,132)]">{stats.averageProtein}g</div>
      </div>
      <div className={`${themeMode === 'dark' ? 'bg-[#2A3142]' : 'bg-white border border-gray-200'} rounded-lg p-3 text-center`}>
        <div className={`text-xs mb-1 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg. Carbs</div>
        <div className="text-lg font-bold text-[rgb(54,162,235)]">{stats.averageCarbs}g</div>
      </div>
      <div className={`${themeMode === 'dark' ? 'bg-[#2A3142]' : 'bg-white border border-gray-200'} rounded-lg p-3 text-center`}>
        <div className={`text-xs mb-1 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg. Fat</div>
        <div className="text-lg font-bold text-[rgb(255,206,86)]">{stats.averageFat}g</div>
      </div>
    </div>
  );

  // Mobile Controls Component
  const MobileControls = () => (
    <div className="space-y-3 mb-4">
      {/* Meal Type Filters */}
      <div>
        <div className="text-sm text-gray-400 mb-2">Meal Types</div>
        <div className="flex flex-wrap gap-2">
          {['breakfast', 'lunch', 'dinner'].map(mealType => (
            <button
              key={mealType}
              onClick={() => setSelectedMealTypes(prev => 
                prev.includes(mealType) 
                  ? prev.filter(t => t !== mealType)
                  : [...prev, mealType]
              )}
              className={`px-3 py-2 rounded-full text-sm capitalize flex-1 min-w-0 ${
                selectedMealTypes.includes(mealType)
                  ? 'bg-blue-500 text-white'
                  : themeMode === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {mealType}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Chart Date Selector - Show when in chart view or initially switching to mobile */}
      {(showChartView || isMobile) && (
        <div>
          <div className="text-sm text-gray-400 mb-2">Chart Display 
            <span className="text-xs text-gray-500 ml-1">(Select time window to show)</span>
          </div>
          <div className="flex gap-2">
            {[
              { value: 'today', label: 'TODAY', desc: 'Just today' },
              { value: 'last3', label: 'Last 3 Days', desc: 'Past 3 days' },
              { value: 'today+2', label: 'Today + 2 Days', desc: 'Today + 2 future' }
            ].map(limit => (
              <button
                key={limit.value}
                onClick={() => {
                  setMobileChartDateLimit(limit.value);
                  setShowChartView(true); // Ensure chart view is shown when selecting a date limit
                }}
                className={`px-3 py-2 rounded-full text-xs flex-1 ${
                  mobileChartDateLimit === limit.value
                    ? 'bg-green-500 text-white'
                    : themeMode === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}
                title={limit.desc}
              >
                {limit.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Mobile List View for detailed meal data
  const MobileDetailedView = () => {
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

    // Sort by date (most recent first)
    mealData.sort((a, b) => b.date - a.date);
    
    // Limit to recent meals for mobile
    const recentMeals = mealData.slice(0, 10);

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Recent Meals</h3>
          <span className="text-sm text-gray-400">Showing {recentMeals.length} of {mealData.length}</span>
        </div>
        
        {recentMeals.map((meal, index) => (
          <div
            key={index}
            className={`bg-[#2A3142] rounded-lg p-4 border-l-4 ${
              meal.mealType === 'breakfast' ? 'border-yellow-400' :
              meal.mealType === 'lunch' ? 'border-green-400' :
              'border-blue-400'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-white">{meal.recipeName}</div>
                <div className="text-sm text-gray-400 capitalize">
                  {meal.mealType} • {meal.date.toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-[rgb(75,192,192)]">🔥</span>
                <span>{meal.macros.calories} cal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[rgb(255,99,132)]">🥩</span>
                <span>{meal.macros.protein_g}g protein</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[rgb(54,162,235)]">🍞</span>
                <span>{meal.macros.carbs_g}g carbs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[rgb(255,206,86)]">🥑</span>
                <span>{meal.macros.fat_g}g fat</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${getCardStyles(themeMode, 'base')}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 p-4 rounded-lg ${getCardStyles(themeMode, 'base')}`}>
        Error: {error}
      </div>
    );
  }

  const chartData = prepareChartData();
  if (!chartData) {
    return (
      <div className={`text-gray-400 p-4 text-center ${getCardStyles(themeMode, 'base')}`}>
        No meal plan data available.
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${themeMode === 'dark' ? 'bg-[#252B3B]/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-3 md:p-6 ${
      themeMode === 'dark' 
        ? 'border border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]'
        : 'border border-gray-200 shadow-lg'
    } space-y-4 md:space-y-6`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className={`text-lg md:text-2xl font-bold ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {isMobile ? 'Meal Report' : 'Meal Plan Report Card'}
          </h2>
          {isMobile && (
            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              {stats.totalMeals}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile view toggle */}
          {isMobile && (
            <button
              onClick={() => setShowChartView(!showChartView)}
              className={getButtonStyles(themeMode, 'primary')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showChartView ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                )}
              </svg>
              {showChartView ? 'List' : 'Chart'}
            </button>
          )}
          
          <button
            onClick={fetchMealPlans}
            disabled={isRefreshing}
            className={getButtonStyles(themeMode, 'secondary')}
            title="Refresh meal plan history"
          >
            <svg
              className={`w-4 h-4 md:w-5 md:h-5 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
      </div>

      {/* Mobile Controls */}
      {isMobile ? (
        <MobileControls />
      ) : (
        /* Desktop Controls */
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
                className={getButtonStyles(themeMode, selectedMealTypes.includes(mealType) ? 'primary' : 'secondary')}
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
                className={getButtonStyles(themeMode, dateRange === range.value ? 'primary' : 'secondary')}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {isMobile ? (
        <MobileSummaryCards />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className={`${themeMode === 'dark' ? 'bg-[#2A3142]' : 'bg-white border border-gray-200'} rounded-lg p-4 text-center`}>
            <div className={`text-sm ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Meals</div>
            <div className={`text-2xl font-bold ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.totalMeals}</div>
          </div>
          <div className={`${themeMode === 'dark' ? 'bg-[#2A3142]' : 'bg-white border border-gray-200'} rounded-lg p-4 text-center`}>
            <div className={`text-sm ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg. Calories</div>
            <div className="text-2xl font-bold text-[rgb(75,192,192)]">{stats.averageCalories}</div>
          </div>
          <div className={`${themeMode === 'dark' ? 'bg-[#2A3142]' : 'bg-white border border-gray-200'} rounded-lg p-4 text-center`}>
            <div className={`text-sm ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg. Protein</div>
            <div className="text-2xl font-bold text-[rgb(255,99,132)]">{stats.averageProtein}g</div>
          </div>
          <div className={`${themeMode === 'dark' ? 'bg-[#2A3142]' : 'bg-white border border-gray-200'} rounded-lg p-4 text-center`}>
            <div className={`text-sm ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg. Carbs</div>
            <div className="text-2xl font-bold text-[rgb(54,162,235)]">{stats.averageCarbs}g</div>
          </div>
          <div className={`${themeMode === 'dark' ? 'bg-[#2A3142]' : 'bg-white border border-gray-200'} rounded-lg p-4 text-center`}>
            <div className={`text-sm ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg. Fat</div>
            <div className="text-2xl font-bold text-[rgb(255,206,86)]">{stats.averageFat}g</div>
          </div>
        </div>
      )}

      {/* Content Area - Chart or List */}
      <div className={`flex-1 ${themeMode === 'dark' ? 'bg-[#252B3B]/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-3 md:p-6 ${
        themeMode === 'dark' 
          ? 'border border-[#ffffff0f]' 
          : 'border border-gray-100'
      }`}>
        {isMobile && !showChartView ? (
          <MobileDetailedView />
        ) : (
          <div className="w-full h-full" style={{ minHeight: isMobile ? '300px' : '400px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>
    </div>
  );
});

export default UserMealPlan; 