require('dotenv').config();
const WeeklyAdScraper = require('../services/weeklyAdScraper');
const GroceryListGenerator = require('../services/groceryListGenerator');
const OpenAiMealPlanner = require('../services/openAiMealPlanner');

async function testGroceryList() {
  try {
    // Get weekly deals
    const scraper = new WeeklyAdScraper();
    const deals = await scraper.getWeeklyAd();

    // Generate grocery list
    const generator = new GroceryListGenerator(deals);
    const groceryList = generator.generateGroceryList();
    const openAIFormat = generator.getOpenAIFormat();

    console.log('\nGrocery List Summary:');
    console.log('--------------------');
    console.log(`Total Cost: $${groceryList.totalCost.toFixed(2)}`);
    console.log(`Total Savings: $${groceryList.totalSavings.toFixed(2)}`);

    console.log('\nBy Category:');
    Object.entries(groceryList.byCategory).forEach(([category, items]) => {
      console.log(`\n${category.toUpperCase()}:`);
      items.forEach(item => {
        console.log(`- ${item.name}: $${item.price} (Save: $${item.savings})`);
      });
    });

    console.log('\nOpenAI Format:');
    console.log(JSON.stringify(openAIFormat, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  }
}

async function testMealPlanning() {
  try {
    // Get weekly deals
    const scraper = new WeeklyAdScraper();
    const deals = await scraper.getWeeklyAd();

    // Generate grocery list
    const generator = new GroceryListGenerator(deals);
    const groceryList = generator.getOpenAIFormat();

    // Sample preferences (matching MealPlannerForm.jsx state)
    const preferences = {
      householdSize: 1,
      mealsPerWeek: { breakfast: 5, lunch: 5, dinner: 5 },
      dietGoals: ['High-Protein'],
      likes: 'chicken, eggs',
      dislikes: 'mushrooms',
      budget: 75,
      targetCalories: 2000,
      macros: {
        protein: 30,
        carbs: 40,
        fat: 30
      }
    };

    // Generate meal plan
    const mealPlanner = new OpenAiMealPlanner(process.env.OPENAI_API_KEY);
    const mealPlan = await mealPlanner.generateMealPlan(groceryList, preferences);

    console.log('\nGenerated Meal Plan:');
    console.log(JSON.stringify(mealPlan, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Make sure OPENAI_API_KEY is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Please set OPENAI_API_KEY environment variable');
  process.exit(1);
}

// Comment out the meal planning test temporarily
testGroceryList();
testMealPlanning();  // Uncomment this line 