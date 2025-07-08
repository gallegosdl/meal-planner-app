#!/usr/bin/env node

/**
 * Node script to transform flat meal plan JSON to nested format
 * 
 * Usage:
 *    node transformGuestMealPlan.js input.json output.json
 */

const fs = require('fs');

if (process.argv.length < 4) {
  console.error('Usage: node transformGuestMealPlan.js <inputFile> <outputFile>');
  process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3];

console.log(`Reading from ${inputFile}...`);

try {
  const rawData = fs.readFileSync(inputFile, 'utf-8');
  const meals = JSON.parse(rawData);

  const result = { dates: {} };

  meals.forEach((meal) => {
    const date = meal.date;
    const mealType = meal.meal_type;

    if (!result.dates[date]) {
      result.dates[date] = { meals: {} };
    }

    // You can optionally clean fields here if needed
    result.dates[date].meals[mealType] = meal;
  });

  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`✅ Transformation complete! Saved to ${outputFile}`);
} catch (err) {
  console.error('❌ Error processing file:', err.message);
  process.exit(1);
}