# Performance Optimizations Changelog

## Overview
This document details the performance optimizations made to resolve infinite update loops and unnecessary re-renders in the meal planner application.

## 1. DailyCalories Component Optimizations

### 1.1 State Management
Replaced multiple state variables with a single, memoized calculation:

```jsx
// Before
const [activityCalories, setActivityCalories] = useState(0);

// After
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
```

### 1.2 useEffect Optimization
Combined multiple useEffect hooks and added state comparison:

```jsx
// Before
useEffect(() => {
  if (totalActivityCalories > 0) {
    setActivityCalories(totalActivityCalories);
  }
}, [stravaActivities, fitbitActivities]);

useEffect(() => {
  const meals = mealPlan?.dailyCalorieTotals?.[0] || 0;
  setCalorieStats({ ... });
}, [stravaActivities, fitbitActivities, mealPlan, targetCalories]);

// After
useEffect(() => {
  const meals = mealPlan?.dailyCalorieTotals?.[0] || 0;
  const { strava, fitbit, total: totalBurned } = activityCalories;
  
  setCalorieStats(prev => {
    const newStats = {
      meals,
      fitbit,
      strava,
      totalBurned,
      target: targetCalories,
      net: meals - totalBurned,
      balance: targetCalories - meals
    };
    
    // Only update if values have changed
    return JSON.stringify(prev) === JSON.stringify(newStats) ? prev : newStats;
  });
}, [mealPlan?.dailyCalorieTotals, activityCalories, targetCalories]);
```

### 1.3 Chart Data Memoization
Memoized chart data and options to prevent unnecessary recalculations:

```jsx
const data = useMemo(() => ({
  labels: defaultLabels,
  datasets: [
    {
      label: 'Target',
      data: new Array(defaultLabels.length).fill(currentTarget),
      borderColor: currentTarget === goals.maintain ? '#10b981' : 
                  currentTarget === goals.lose ? '#ef4444' : 
                  '#f59e0b',
      // ... other styling properties
    },
    // ... other datasets
  ]
}), [currentTarget, activityCalories, mealPlan?.dailyCalorieTotals, isFormMode]);

const options = useMemo(() => ({
  responsive: true,
  maintainAspectRatio: false,
  // ... chart options
}), [currentTarget, activityCalories.total, mealPlan?.dailyCalorieTotals]);
```

## 2. MealPlannerForm Component Optimizations

### 2.1 Callback Memoization
Memoized event handlers to prevent unnecessary re-renders:

```jsx
const handleDailyTotalsCalculated = React.useCallback((totals) => {
  // Only update if the totals have actually changed
  if (JSON.stringify(dailyCalorieTotals) !== JSON.stringify(totals)) {
    setDailyCalorieTotals(totals);
  }
}, [dailyCalorieTotals]);

const handleStravaCalories = React.useCallback((calories) => {
  setActivityCalories(prev => ({ ...prev, strava: calories }));
}, []);

const handleFitbitCalories = React.useCallback((calories) => {
  setActivityCalories(prev => ({ ...prev, fitbit: calories }));
}, []);
```

### 2.2 Props Optimization
Improved prop passing to prevent unnecessary object creation:

```jsx
// Before
<DailyCalories 
  mealPlan={{ days: mealPlan?.days || [], dailyCalorieTotals }}
  // ... other props
/>

// After
<DailyCalories 
  mealPlan={mealPlan ? {
    days: mealPlan.days || [],
    dailyCalorieTotals: dailyCalorieTotals
  } : null}
  // ... other props
/>
```

## 3. Component Memoization
Applied React.memo to prevent unnecessary re-renders:

```jsx
// Before
export default DailyCalories;

// After
export default React.memo(DailyCalories);
```

## Results
These optimizations resolved:
1. Infinite update loops in DailyCalories component
2. Unnecessary re-renders triggered by state updates
3. Excessive console logging
4. Performance issues with chart data calculations
5. Redundant prop updates

## Best Practices Implemented
1. Use useMemo for expensive calculations
2. Compare state before updates
3. Memoize event handlers with useCallback
4. Combine related state updates
5. Proper dependency arrays in hooks
6. Conditional prop passing
7. Component memoization with React.memo 