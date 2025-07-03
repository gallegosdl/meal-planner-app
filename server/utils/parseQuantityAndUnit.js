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

/**
 * Unit conversion table - all conversions are to a base unit
 */
const UNIT_CONVERSIONS = {
  // Volume (base: ml)
  'ml': 1,
  'l': 1000,
  'cup': 236.588,
  'tbsp': 14.787,
  'tsp': 4.929,
  'fl oz': 29.574,
  'pint': 473.176,
  'quart': 946.353,
  'gallon': 3785.41,
  
  // Weight (base: g)
  'g': 1,
  'kg': 1000,
  'oz': 28.35,
  'lb': 453.592,
  
  // Count (base: each)
  'each': 1,
  'piece': 1,
  'item': 1,
  'clove': 1,
  'bunch': 1,
  'head': 1,
  'can': 1,
  'package': 1,
  'small': 1,
  'medium': 1,
  'large': 1,
  
  // Special units
  'to taste': 1,
  'pinch': 1,
  'dash': 1
};

/**
 * Unit categories for compatibility checking
 */
const UNIT_CATEGORIES = {
  volume: ['ml', 'l', 'cup', 'tbsp', 'tsp', 'fl oz', 'pint', 'quart', 'gallon'],
  weight: ['g', 'kg', 'oz', 'lb'],
  count: ['each', 'piece', 'item', 'clove', 'bunch', 'head', 'can', 'package', 'small', 'medium', 'large'],
  special: ['to taste', 'pinch', 'dash']
};

/**
 * Checks if two units are compatible for conversion
 * @param {string} unit1 - First unit
 * @param {string} unit2 - Second unit
 * @returns {boolean} True if units are compatible
 */
function areUnitsCompatible(unit1, unit2) {
  // Same unit is always compatible
  if (unit1 === unit2) return true;
  
  // Special units are only compatible with themselves
  if (UNIT_CATEGORIES.special.includes(unit1) || UNIT_CATEGORIES.special.includes(unit2)) {
    return unit1 === unit2;
  }
  
  // Check if both units are in the same category
  for (const category of Object.values(UNIT_CATEGORIES)) {
    if (category.includes(unit1) && category.includes(unit2)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Converts quantity from one unit to another
 * @param {number} quantity - Amount to convert
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 * @returns {number|null} Converted quantity or null if incompatible
 */
function convertUnits(quantity, fromUnit, toUnit) {
  // Same unit, no conversion needed
  if (fromUnit === toUnit) return quantity;
  
  // Check if units are compatible
  if (!areUnitsCompatible(fromUnit, toUnit)) {
    return null;
  }
  
  // Special handling for "to taste" and similar
  if (UNIT_CATEGORIES.special.includes(fromUnit) || UNIT_CATEGORIES.special.includes(toUnit)) {
    return fromUnit === toUnit ? quantity : null;
  }
  
  // Get conversion factors
  const fromFactor = UNIT_CONVERSIONS[fromUnit];
  const toFactor = UNIT_CONVERSIONS[toUnit];
  
  if (!fromFactor || !toFactor) {
    return null;
  }
  
  // Convert to base unit, then to target unit
  const baseQuantity = quantity * fromFactor;
  const convertedQuantity = baseQuantity / toFactor;
  
  return Math.round(convertedQuantity * 100) / 100; // Round to 2 decimal places
}

/**
 * Attempts to match ingredient amounts considering unit compatibility
 * @param {string} recipeAmount - Recipe ingredient amount (e.g., "2 tbsp")
 * @param {number} pantryQuantity - Pantry item quantity
 * @param {string} pantryUnit - Pantry item unit
 * @returns {{canUse: boolean, convertedAmount: number, message: string}}
 */
function matchIngredientAmount(recipeAmount, pantryQuantity, pantryUnit) {
  // Parse the recipe amount
  const parsed = parseQuantityAndUnit(`(${recipeAmount})`);
  const { quantity: recipeQuantity, unit: recipeUnit } = parsed;
  
  // Try to convert recipe amount to pantry unit
  const convertedAmount = convertUnits(recipeQuantity, recipeUnit, pantryUnit);
  
  if (convertedAmount === null) {
    return {
      canUse: false,
      convertedAmount: 0,
      message: `Cannot convert ${recipeUnit} to ${pantryUnit} - incompatible units`
    };
  }
  
  if (pantryQuantity >= convertedAmount) {
    return {
      canUse: true,
      convertedAmount: convertedAmount,
      message: `Using ${convertedAmount} ${pantryUnit} from pantry (${pantryQuantity} available)`
    };
  } else {
    return {
      canUse: false,
      convertedAmount: convertedAmount,
      message: `Need ${convertedAmount} ${pantryUnit} but only ${pantryQuantity} available`
    };
  }
}

module.exports = {
  parseQuantityAndUnit,
  areUnitsCompatible,
  convertUnits,
  matchIngredientAmount,
  UNIT_CONVERSIONS,
  UNIT_CATEGORIES
}; 