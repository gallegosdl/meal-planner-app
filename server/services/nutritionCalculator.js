class NutritionCalculator {
  // Mifflin-St Jeor Equation for BMR
  calculateBMR(weight, height, age, gender) {
    // weight in kg, height in cm, age in years
    if (gender.toLowerCase() === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  }

  // Activity multipliers for TDEE
  getActivityMultiplier(activityLevel) {
    const multipliers = {
      'sedentary': 1.2,      // Little or no exercise
      'light': 1.375,        // Light exercise/sports 1-3 days/week
      'moderate': 1.55,      // Moderate exercise/sports 3-5 days/week
      'very active': 1.725,  // Hard exercise/sports 6-7 days/week
      'extra active': 1.9    // Very hard exercise/sports & physical job or training
    };
    return multipliers[activityLevel.toLowerCase()] || 1.2;
  }

  calculateTDEE(bmr, activityLevel) {
    return bmr * this.getActivityMultiplier(activityLevel);
  }

  calculateTargets(tdee, goal) {
    let targetCalories = tdee;
    
    // Adjust calories based on goal
    switch(goal.toLowerCase()) {
      case 'lose':
        targetCalories = tdee - 500; // 500 calorie deficit for 1lb/week loss
        break;
      case 'gain':
        targetCalories = tdee + 500; // 500 calorie surplus for 1lb/week gain
        break;
      // 'maintain' uses tdee as is
    }

    // Calculate macronutrient targets
    // Protein: 2.2g per kg of body weight
    // Fat: 25% of total calories
    // Carbs: Remaining calories
    return {
      calories: Math.round(targetCalories),
      protein: Math.round(targetCalories * 0.3 / 4), // 30% of calories from protein
      fat: Math.round(targetCalories * 0.25 / 9),    // 25% of calories from fat
      carbs: Math.round(targetCalories * 0.45 / 4)   // 45% of calories from carbs
    };
  }

  // Estimate calories burned for common exercises
  estimateExerciseCalories(exercise, duration, weight) {
    const mets = {
      'walking': 3.5,
      'running': 8.0,
      'cycling': 7.0,
      'swimming': 6.0,
      'weight training': 3.5,
      'yoga': 2.5,
      'hiit': 8.0
    };

    const met = mets[exercise.toLowerCase()] || 3.0;
    return Math.round((met * 3.5 * weight * duration) / 200);
  }

  // Calculate recipe nutrition per serving
  calculateRecipeNutrition(ingredients, servings) {
    let totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0
    };

    ingredients.forEach(ingredient => {
      // Convert amount to standard unit if possible
      const amount = this.standardizeAmount(ingredient.amount, ingredient.unit);
      
      // Add nutritional values
      Object.keys(totals).forEach(nutrient => {
        if (ingredient[`${nutrient}_per_unit`]) {
          totals[nutrient] += ingredient[`${nutrient}_per_unit`] * amount;
        }
      });
    });

    // Divide by number of servings
    Object.keys(totals).forEach(nutrient => {
      totals[nutrient] = Math.round(totals[nutrient] / servings);
    });

    return totals;
  }

  // Helper function to standardize measurements
  standardizeAmount(amount, unit) {
    // Conversion factors for common units
    const conversions = {
      'cup': 240,
      'tbsp': 15,
      'tsp': 5,
      'oz': 28.35,
      'lb': 453.6,
      'g': 1,
      'ml': 1
    };

    try {
      const value = parseFloat(amount);
      const standardUnit = conversions[unit.toLowerCase()];
      return value * (standardUnit || 1);
    } catch (error) {
      console.error('Error standardizing amount:', error);
      return 0;
    }
  }

  // Calculate daily nutrition totals from meal logs
  calculateDailyTotals(mealLogs) {
    return mealLogs.reduce((totals, meal) => {
      totals.calories += meal.actual_calories || 0;
      totals.protein += meal.actual_protein || 0;
      totals.carbs += meal.actual_carbs || 0;
      totals.fat += meal.actual_fat || 0;
      return totals;
    }, {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    });
  }

  // Check if daily targets are met
  checkNutritionTargets(actual, targets) {
    const tolerance = 0.1; // 10% tolerance
    
    return {
      calories: this.checkTarget(actual.calories, targets.calories, tolerance),
      protein: this.checkTarget(actual.protein, targets.protein, tolerance),
      carbs: this.checkTarget(actual.carbs, targets.carbs, tolerance),
      fat: this.checkTarget(actual.fat, targets.fat, tolerance)
    };
  }

  checkTarget(actual, target, tolerance) {
    const min = target * (1 - tolerance);
    const max = target * (1 + tolerance);
    
    return {
      met: actual >= min && actual <= max,
      difference: actual - target,
      percentageOfTarget: (actual / target) * 100
    };
  }
}

module.exports = new NutritionCalculator(); 