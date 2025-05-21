class MealPrepGenerator {
  constructor(weeklyDeals) {
    this.deals = weeklyDeals;
    this.mealTemplates = {
      breakfast: [
        { name: 'Oatmeal with Fruit', needs: ['oats', 'fruit'] },
        { name: 'Eggs and Toast', needs: ['eggs', 'bread'] },
        { name: 'Yogurt Parfait', needs: ['yogurt', 'fruit'] }
      ],
      lunch: [
        { name: 'Chicken Salad', needs: ['chicken', 'salad'] },
        { name: 'Rice Bowl', needs: ['rice', 'protein', 'vegetable'] },
        { name: 'Sandwich', needs: ['bread', 'protein', 'vegetable'] }
      ],
      dinner: [
        { name: 'Protein with Veggies', needs: ['protein', 'vegetable'] },
        { name: 'Pasta Dish', needs: ['pasta', 'protein', 'vegetable'] },
        { name: 'Stir Fry', needs: ['rice', 'protein', 'vegetable'] }
      ]
    };
  }

  generateMealPlan(preferences) {
    const { mealsPerWeek, dietGoals, budget } = preferences;
    const plan = {
      meals: [],
      totalCost: 0,
      savings: 0
    };

    // Generate meals based on what's on sale
    Object.entries(mealsPerWeek).forEach(([mealType, count]) => {
      for (let i = 0; i < count; i++) {
        const meal = this.selectMeal(mealType, dietGoals);
        const ingredients = this.findIngredients(meal.needs);
        
        plan.meals.push({
          type: mealType,
          ...meal,
          ingredients,
          cost: this.calculateCost(ingredients)
        });
      }
    });

    // Calculate totals
    plan.totalCost = plan.meals.reduce((sum, meal) => sum + meal.cost, 0);
    plan.savings = plan.meals.reduce((sum, meal) => 
      sum + meal.ingredients.reduce((s, i) => s + (i.savings || 0), 0), 
    0);

    return plan;
  }

  selectMeal(type, dietGoals) {
    const templates = this.mealTemplates[type].filter(meal =>
      this.meetsDietaryGoals(meal, dietGoals)
    );
    return templates[Math.floor(Math.random() * templates.length)];
  }

  findIngredients(needs) {
    return needs.map(need => {
      const category = this.getCategoryForNeed(need);
      const deals = this.deals[category] || [];
      return deals.length ? deals[Math.floor(Math.random() * deals.length)] : null;
    }).filter(Boolean);
  }

  calculateCost(ingredients) {
    return ingredients.reduce((sum, item) => 
      sum + (parseFloat(item.price?.replace('$', '') || 0)), 
    0);
  }

  meetsDietaryGoals(meal, goals) {
    // Implement dietary restrictions check
    return true; // Simplified for example
  }

  getCategoryForNeed(need) {
    const categoryMap = {
      protein: 'protein',
      vegetable: 'produce',
      fruit: 'produce',
      bread: 'pantry',
      pasta: 'pantry',
      rice: 'pantry',
      eggs: 'dairy',
      yogurt: 'dairy'
    };
    return categoryMap[need] || 'other';
  }
}

module.exports = MealPrepGenerator; 