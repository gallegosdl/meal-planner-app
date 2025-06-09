const { isPantryItem } = require('../config/pantryConfig');

// Test cases for spice filtering
const testCases = [
  // Basic spices
  { input: 'salt', expected: true },
  { input: 'salt (to taste)', expected: true },
  { input: 'black pepper', expected: true },
  { input: 'pepper (1/4 tsp)', expected: true },
  
  // Herbs
  { input: 'fresh oregano', expected: true },
  { input: 'dried basil', expected: true },
  { input: 'dried basil leaves', expected: true },
  { input: 'italian herbs (1 tsp)', expected: true },
  { input: 'mixed herbs (2 tbsp)', expected: true },
  
  // Ground spices
  { input: 'ground cumin', expected: true },
  { input: 'ground cinnamon (1 tsp)', expected: true },
  { input: 'powdered ginger', expected: true },
  { input: 'ground nutmeg (1/8 tsp)', expected: true },
  
  // Spice blends
  { input: 'italian seasoning blend', expected: true },
  { input: 'herbs de provence (1 tsp)', expected: true },
  { input: 'chinese five spice (1/2 tsp)', expected: true },
  { input: 'poultry seasoning (1 tsp)', expected: true },
  
  // Common recipe ingredients that should NOT be filtered
  { input: 'chicken breast', expected: false },
  { input: 'ground beef', expected: false },
  { input: 'yellow onion', expected: false },
  { input: 'fresh garlic', expected: false },
  { input: 'fresh ginger root', expected: false },
  { input: 'bell pepper', expected: false },
  { input: 'red pepper', expected: false },
  { input: 'lemon', expected: false },
  { input: 'olive oil', expected: false }
];

// Run tests
console.log('Running spice filtering tests...\n');
let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }) => {
  const result = isPantryItem(input);
  const status = result === expected ? '✅ PASS' : '❌ FAIL';
  
  if (result === expected) {
    passed++;
  } else {
    failed++;
    console.log(`${status} - "${input}"`);
    console.log(`  Expected: ${expected}, Got: ${result}\n`);
  }
});

console.log(`\nTest Summary:`);
console.log(`Total Tests: ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`); 