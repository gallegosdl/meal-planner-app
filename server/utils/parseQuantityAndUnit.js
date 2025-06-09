/**
 * Parses a display text string to extract quantity and unit information.
 * @param {string} displayText - The text to parse (e.g. "Salt (2 tbsp)")
 * @returns {{quantity: number, unit: string}} Parsed quantity and standardized unit
 */
function parseQuantityAndUnit(displayText) {
  // Extract the content within parentheses
  const match = displayText.match(/\(([^)]+)\)/);
  if (!match) return { quantity: 1, unit: 'each' };

  const amountStr = match[1].toLowerCase();
  
  // Handle "to taste" case
  if (amountStr.includes('to taste')) {
    return { quantity: 1, unit: 'to taste' };
  }

  // Parse numeric value and unit
  // This regex handles fractions (1/2), decimals (1.5), and various unit formats
  const numMatch = amountStr.match(/(\d+(?:\/\d+|\.\d+)?)\s*([a-zA-Z]+|small|medium|large|clove|bunch|cup)/i);
  if (!numMatch) return { quantity: 1, unit: 'each' };

  let quantity = numMatch[1];
  const unit = numMatch[2].toLowerCase().trim();

  // Convert fractions to decimals
  if (quantity.includes('/')) {
    const [num, denom] = quantity.split('/');
    quantity = parseFloat(num) / parseFloat(denom);
  } else {
    quantity = parseFloat(quantity);
  }

  // Standardize units
  const unitMap = {
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'tbsp.': 'tbsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'tsp.': 'tsp',
    'ounce': 'oz',
    'ounces': 'oz',
    'oz.': 'oz',
    'pound': 'lb',
    'pounds': 'lb',
    'lb.': 'lb',
    'gram': 'g',
    'grams': 'g',
    'g.': 'g',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'kg.': 'kg',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'ml.': 'ml',
    'liter': 'l',
    'liters': 'l',
    'l.': 'l',
    'cups': 'cup',
    'cup.': 'cup'
  };

  return {
    quantity,
    unit: unitMap[unit] || unit
  };
}

module.exports = parseQuantityAndUnit; 