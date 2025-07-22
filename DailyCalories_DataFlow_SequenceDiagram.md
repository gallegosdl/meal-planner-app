# DailyCalories Data Flow Sequence Diagram

## Overview
This sequence diagram shows the complete data flow for the DailyCalories components, including how they retrieve meal plan data from the database and integrate with fitness tracking data.

## Files Involved

### Frontend Components
- `client/src/components/DailyCalories.jsx` - Main component orchestrating data flow
- `client/src/components/DailyCaloriesChart.jsx` - Chart visualization component
- `client/src/components/DailyCaloriesSummary.jsx` - Summary statistics component
- `client/src/components/MealPlannerForm.jsx` - Parent component that provides data
- `client/src/components/FitbitDisplay.jsx` - Fitness data integration
- `client/src/components/StravaDisplay.jsx` - Fitness data integration

### Backend Services
- `client/src/services/api.js` - API client configuration
- `server/routes/mealPlan.js` - Meal plan API endpoints
- `server/services/mealPlanGenerator.js` - Database operations and meal plan logic
- `server/routes/strava.js` - Strava API integration
- `server/routes/fitbit.js` - Fitbit API integration

### Database
- `server/db/schema.sql` - Database schema
- `server/services/database.js` - Database connection service

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant DailyCalories as DailyCalories.jsx
    participant MealPlannerForm as MealPlannerForm.jsx
    participant API as api.js
    participant MealPlanRoute as /api/meal-plans
    participant MealPlanGenerator as mealPlanGenerator.js
    participant Database as PostgreSQL
    participant FitbitDisplay as FitbitDisplay.jsx
    participant StravaDisplay as StravaDisplay.jsx
    participant FitbitRoute as /api/fitbit
    participant StravaRoute as /api/strava
    participant DailyCaloriesChart as DailyCaloriesChart.jsx
    participant DailyCaloriesSummary as DailyCaloriesSummary.jsx

    Note over User, DailyCaloriesSummary: Initial Load - User opens meal planner

    User->>MealPlannerForm: Opens meal planner page
    MealPlannerForm->>DailyCalories: Renders with userId prop
    
    alt User has existing meal plans
        DailyCalories->>API: GET /api/meal-plans/user-meal-plans/{userId}
        API->>MealPlanRoute: GET /user-meal-plans/{userId}
        MealPlanRoute->>MealPlanGenerator: getMealPlansForUser(userId)
        MealPlanGenerator->>Database: SELECT from meal_plans, meal_plan_dates, meal_plan_meals, recipes
        Database-->>MealPlanGenerator: Returns meal plan data
        MealPlanGenerator-->>MealPlanRoute: Returns structured meal plans
        MealPlanRoute-->>API: Returns meal plan JSON
        API-->>DailyCalories: Returns meal plan data
        DailyCalories->>DailyCalories: calculateDailyCalories(mealPlans)
        DailyCalories->>DailyCalories: setUserMealPlans(data)
    else Guest user or no meal plans
        DailyCalories->>API: GET /api/meal-plans/user-meal-plans/guest
        API->>MealPlanRoute: GET /user-meal-plans/guest
        MealPlanRoute->>MealPlanRoute: Load guest data from JSON file
        MealPlanRoute-->>API: Returns guest meal plan data
        API-->>DailyCalories: Returns guest meal plan data
    end

    Note over User, DailyCaloriesSummary: Fitness Data Integration

    par Fitbit Integration
        FitbitDisplay->>FitbitRoute: OAuth callback or data fetch
        FitbitRoute->>FitbitRoute: Process Fitbit API data
        FitbitRoute-->>FitbitDisplay: Returns activities with calories
        FitbitDisplay->>MealPlannerForm: handleFitbitCalories(calories)
        MealPlannerForm->>DailyCalories: stravaActivities prop update
    and Strava Integration
        StravaDisplay->>StravaRoute: OAuth callback or data fetch
        StravaRoute->>StravaRoute: Process Strava API data
        StravaRoute-->>StravaDisplay: Returns activities with calories
        StravaDisplay->>MealPlannerForm: handleStravaCalories(calories)
        MealPlannerForm->>DailyCalories: fitbitActivities prop update
    end

    Note over User, DailyCaloriesSummary: Data Processing and Display

    DailyCalories->>DailyCalories: activityCalories calculation (useMemo)
    DailyCalories->>DailyCalories: calorieStats calculation (useEffect)
    DailyCalories->>DailyCalories: chartDataCalculation (useMemo)

    DailyCalories->>DailyCaloriesChart: Pass chart data and activity calories
    DailyCaloriesChart->>DailyCaloriesChart: Generate Chart.js datasets (useMemo)
    DailyCaloriesChart->>DailyCaloriesChart: Render Line chart with meal data + activities

    DailyCalories->>DailyCaloriesSummary: Pass calorieStats
    DailyCaloriesSummary->>DailyCaloriesSummary: Render summary statistics

    Note over User, DailyCaloriesSummary: User Interaction - Goal Changes

    User->>DailyCaloriesChart: Changes calorie goal (dropdown)
    DailyCaloriesChart->>DailyCalories: handleGoalChange()
    DailyCalories->>MealPlannerForm: handleChange('targetCalories', newValue)
    MealPlannerForm->>DailyCalories: Updated targetCalories prop
    DailyCalories->>DailyCalories: Update calorieStats (useEffect)
    DailyCalories->>DailyCaloriesChart: Re-render with new target line
    DailyCalories->>DailyCaloriesSummary: Re-render with updated stats

    Note over User, DailyCaloriesSummary: Real-time Updates

    loop Continuous Updates
        DailyCalories->>DailyCalories: Monitor for new meal plan data
        DailyCalories->>DailyCalories: Monitor for new fitness data
        DailyCalories->>DailyCalories: Recalculate totals and stats
        DailyCalories->>DailyCaloriesChart: Update chart data
        DailyCalories->>DailyCaloriesSummary: Update summary display
    end
```

## Database Schema for Meal Plans

The meal plan data is stored across several tables:

```sql
-- Main meal plan container
CREATE TABLE meal_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual dates within a meal plan
CREATE TABLE meal_plan_dates (
  id SERIAL PRIMARY KEY,
  meal_plan_id INTEGER REFERENCES meal_plans(id),
  date DATE NOT NULL
);

-- Meals for each date
CREATE TABLE meal_plan_meals (
  id SERIAL PRIMARY KEY,
  meal_plan_date_id INTEGER REFERENCES meal_plan_dates(id),
  meal_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner'
  recipe_id INTEGER REFERENCES recipes(id),
  planned_macros JSONB, -- Stores nutrition data
  planned_image_url TEXT
);

-- User notes for meals
CREATE TABLE meal_plan_meal_notes (
  id SERIAL PRIMARY KEY,
  meal_plan_meal_id INTEGER REFERENCES meal_plan_meals(id),
  user_rating INTEGER,
  user_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Key Data Flow Points

1. **Initial Load**: DailyCalories checks for userId and fetches existing meal plans from database
2. **Guest Mode**: Falls back to static JSON data for demo purposes
3. **Fitness Integration**: Real-time calorie data from Fitbit/Strava APIs
4. **Data Processing**: Calculates daily totals, activity calories, and net calorie balance
5. **Visualization**: Chart shows meal calories vs target, with activity data overlaid
6. **Real-time Updates**: Components react to changes in meal plans and fitness data

## Error Handling

- Database connection failures fall back to guest data
- Missing fitness data shows zero calories burned
- Invalid meal plan data uses default values
- API failures are logged and handled gracefully

This architecture provides a robust, real-time calorie tracking system that integrates meal planning with fitness data for comprehensive nutrition management. 