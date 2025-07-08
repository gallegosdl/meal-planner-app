// client/src/components/DailyCalories.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { getCardStyles } from '../utils/styleUtils';
import DailyCaloriesChart from './DailyCaloriesChart';
import DailyCaloriesSummary from './DailyCaloriesSummary';
import VoiceMicButton from './VoiceMicButton';

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

const DailyCalories = React.memo(({ 
  formData: { targetCalories = 2000 }, 
  handleChange = () => {}, 
  mealPlan, // This might be the generated meal plan from form
  isFormMode = false,
  stravaActivities = [],
  fitbitActivities = [],
  userId // NEW: Accept userId as prop
}) => {
  // THEME FRAMEWORK INTEGRATION
  const { themeMode } = useTheme();
  
  // Generate theme-aware styles using the theme system
  const containerStyles = getCardStyles(themeMode, 'base', { layout: 'full' });
  
  // Define goal calorie levels
  const goals = useMemo(() => ({
    maintain: 2000,
    lose: 1800,
    gain: 2300
  }), []);

  // NEW: State for fetched meal plans (actual user meal history)
  const [userMealPlans, setUserMealPlans] = useState([]);
  const [mealPlanLoading, setMealPlanLoading] = useState(false);
  const [dailyCalorieTotals, setDailyCalorieTotals] = useState([]);

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

  // NEW: Fetch user meal plans for actual calorie data
  const fetchUserMealPlans = useCallback(async (userIdToUse) => {
    if (!userIdToUse) {
      console.log('📊 DailyCalories: No userId provided to fetchUserMealPlans');
      return;
    }
    
    try {
      console.log('📊 DailyCalories: Fetching meal plans for userId:', userIdToUse);
      setMealPlanLoading(true);
      const response = await api.get(`/api/meal-plans/user-meal-plans/${userIdToUse}`);
      console.log('📊 DailyCalories: Fetched meal plans:', response.data);
      setUserMealPlans(response.data);
    } catch (err) {
      console.error('📊 DailyCalories: Error fetching meal plans:', err);
    } finally {
      setMealPlanLoading(false);
    }
  }, []);

  // NEW: Calculate daily calorie totals from meal plan data
  const calculateDailyCalories = useCallback((mealPlans) => {
    console.log('📊 DailyCalories: Calculating daily calories from meal plans:', mealPlans);
    
    if (!mealPlans.length) {
      console.log('📊 DailyCalories: No meal plans to calculate from');
      return { totals: [], labels: [] };
    }

    const dailyTotals = {};

    mealPlans.forEach(plan => {
      Object.entries(plan.dates).forEach(([dateStr, dateData]) => {
        if (!dailyTotals[dateStr]) {
          dailyTotals[dateStr] = 0;
        }

        Object.entries(dateData.meals).forEach(([mealType, meal]) => {
          if (meal.plannedMacros?.calories) {
            dailyTotals[dateStr] += meal.plannedMacros.calories;
          }
        });
      });
    });

    // FIXED: Sort dates properly as dates, not strings
    const sortedDates = Object.keys(dailyTotals).sort((a, b) => {
      return new Date(a) - new Date(b); // Proper date sorting
    });
    const recentDates = sortedDates.slice(-7); // Last 7 days

    const totals = recentDates.map(date => dailyTotals[date] || 0);
    const labels = recentDates.map(date => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    console.log('📊 DailyCalories: Calculated daily totals:', { labels, totals, dailyTotals, sortedDates });
    
    setDailyCalorieTotals(totals);
    return { totals, labels };
  }, []);

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
    // Use dailyCalorieTotals[0] (today's calories) or fallback to old mealPlan structure
    const meals = dailyCalorieTotals[0] || mealPlan?.dailyCalorieTotals?.[0] || 0;
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
  }, [dailyCalorieTotals, mealPlan?.dailyCalorieTotals, activityCalories, targetCalories]);

  // NEW: Fetch meal plans when userId is available (ONLY if no meal plan data provided)
  useEffect(() => {
    console.log('📊 DailyCalories: Effect triggered - userId:', userId, 'isFormMode:', isFormMode, 'mealPlan provided:', !!mealPlan);
    
    // If meal plan data is already provided via props, don't fetch from API
    if (mealPlan) {
      console.log('📊 DailyCalories: Using provided meal plan data, skipping API fetch');
      return;
    }
    
    // Try to get userId from prop first, then fallback to other sources
    const userIdToUse = userId || 
                       window.user?.id || 
                       sessionStorage.getItem('userId') || 
                       localStorage.getItem('userId');
    
    console.log('📊 DailyCalories: Resolved userId:', userIdToUse);
    
    if (userIdToUse && !isFormMode) {
      fetchUserMealPlans(userIdToUse);
    } else {
      console.log('📊 DailyCalories: Not fetching - missing userId or in form mode');
    }
  }, [userId, fetchUserMealPlans, isFormMode, mealPlan]);

  // NEW: Process meal plan data when it changes
  useEffect(() => {
    if (userMealPlans.length > 0) {
      console.log('📊 DailyCalories: Processing fetched meal plans:', userMealPlans.length);
      calculateDailyCalories(userMealPlans);
    }
  }, [userMealPlans, calculateDailyCalories]);

  // NEW: Calculate chart labels and meal calories separately
  const chartDataCalculation = useMemo(() => {
    // PRIORITY 1: Use provided meal plan data (for guest demo or form-generated data)
    if (mealPlan && Array.isArray(mealPlan)) {
      console.log('📊 DailyCalories: Using provided array meal plan data');
      return calculateDailyCalories(mealPlan);
    }
    
    // PRIORITY 2: Use fetched user meal plans
    if (userMealPlans.length > 0) {
      console.log('📊 DailyCalories: Using fetched user meal plans');
      return calculateDailyCalories(userMealPlans);
    } 
    
    // PRIORITY 3: Use legacy mealPlan structure
    if (mealPlan?.dailyCalorieTotals?.length > 0) {
      console.log('📊 DailyCalories: Using legacy meal plan structure');
      const totals = mealPlan.dailyCalorieTotals;
      const labels = totals.map((_, index) => `Day ${index + 1}`);
      return { totals, labels };
    } 
    
    // DEFAULT: Empty data
    console.log('📊 DailyCalories: No data available, using defaults');
    return { 
      totals: [], 
      labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'] 
    };
  }, [mealPlan, userMealPlans, calculateDailyCalories]);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${containerStyles}`}>
      {/* Left Column - Chart Component */}
      <DailyCaloriesChart
        targetCalories={targetCalories}
        goals={goals}
        handleGoalChange={handleGoalChange}
        getCurrentGoal={getCurrentGoal}
        mealPlanLoading={mealPlanLoading}
        chartDataCalculation={chartDataCalculation}
        activityCalories={activityCalories}
      />

      {/* Right Column - Summary Component */}
      <DailyCaloriesSummary
        calorieStats={calorieStats}
      />
    </div>
  );
});

export default DailyCalories; 