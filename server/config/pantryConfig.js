const PANTRY_ITEMS = {
  SPICES_AND_HERBS: [
    'salt',
    'black pepper',
    'pepper',
    'oregano',
    'basil',
    'thyme',
    'paprika',
    'cumin',
    'cinnamon',
    'nutmeg',
    'garlic powder',
    'onion powder',
    'chili powder',
    'red pepper flakes',
    'bay leaves',
    'sage',
    'rosemary',
    'turmeric',
    'ginger powder',
    'allspice',
    'cilantro',
    'dill',
    'parsley',
    'mint',
    'curry powder',
    'italian seasoning',
    'italian herbs',
    'herbs de provence',
    'poultry seasoning',
    'pumpkin pie spice',
    'chinese five spice',
    'garam masala',
    'cardamom',
    'coriander',
    'fennel',
    'marjoram',
    'tarragon',
    'celery salt',
    'seasoned salt',
    'garlic salt',
    'onion salt',
    'lemon pepper',
    'cayenne',
    'crushed red pepper',
    'ground ginger',
    'ground mustard',
    'mustard powder',
    'white pepper',
    'black peppercorns',
    'whole peppercorns',
    'seasoning blend',
    'spice blend',
    'mixed herbs',
    'dried herbs',
    'ground spices'
  ],
  BAKING: [
    'all purpose flour',
    'bread flour',
    'cake flour',
    'white flour',
    'granulated sugar',
    'white sugar',
    'brown sugar',
    'powdered sugar',
    'confectioners sugar',
    'baking powder',
    'baking soda',
    'cornstarch',
    'vanilla extract',
    'pure vanilla extract',
    'active dry yeast',
    'instant yeast',
    'cocoa powder',
    'unsweetened cocoa powder'
  ],
  BROTHS_AND_STOCKS: [
    'chicken broth',
    'beef broth',
    'vegetable broth',
    'chicken stock',
    'beef stock',
    'vegetable stock',
    'bouillon cubes',
    'chicken bouillon',
    'beef bouillon'
  ],
  OILS_AND_VINEGARS: [
    'olive oil',
    'vegetable oil',
    'canola oil',
    'coconut oil',
    'sesame oil',
    'cooking spray',
    'white vinegar',
    'balsamic vinegar',
    'apple cider vinegar',
    'rice vinegar'
  ],
  CONDIMENTS: [
    'soy sauce',
    'mustard',
    'mayonnaise',
    'ketchup',
    'hot sauce',
    'worcestershire sauce',
    'fish sauce',
    'oyster sauce',
    'hoisin sauce',
    'sriracha',
    'tabasco'
  ],
  CANNED_GOODS: [
    'tomato paste',
    'tomato sauce',
    'diced tomatoes',
    'crushed tomatoes',
    'canned black beans',
    'canned kidney beans',
    'canned chickpeas',
    'canned garbanzo beans',
    'coconut milk'
  ],
  GRAINS: [
    'white rice',
    'brown rice',
    'quinoa',
    'pasta',
    'bread crumbs',
    'oats',
    'cornmeal',
    'couscous'
  ]
};

// Default pantry settings
const DEFAULT_PANTRY_SETTINGS = {
  includePantryItems: false,  // By default, exclude pantry items
  customPantryItems: [],      // User can add their own pantry items
  excludedCategories: [],     // User can exclude entire categories
  minimumQuantity: {          // Only add to cart if below these amounts
    SPICES_AND_HERBS: '1 oz',
    OILS_AND_VINEGARS: '8 oz',
    CONDIMENTS: '4 oz',
    CANNED_GOODS: '1 can',
    BROTHS_AND_STOCKS: '32 oz',
    GRAINS: '1 lb'
  }
};

// Helper function to check if an item is a pantry item
function isPantryItem(itemName, settings = { includePantryItems: false }) {
  if (!settings.includePantryItems) {
    const normalizedName = itemName.toLowerCase().trim();
    
    // Check each category
    for (const [category, items] of Object.entries(PANTRY_ITEMS)) {
      for (const pantryItem of items) {
        // Create a regex that matches the exact pantry item name
        // This prevents partial matches and ensures word boundaries
        const escapedItem = pantryItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Enhanced regex patterns for better matching:
        // 1. Match at word boundaries
        // 2. Allow for optional qualifiers like "ground", "dried", "powder"
        // 3. Allow for "seasoning" or "spice" suffix
        const qualifiers = '(?:ground |dried |powdered |whole |crushed )?';
        const suffixes = '(?:\\s*(?:seasoning|spice|powder|blend)s?)?';
        const regex = new RegExp(`(?:^|\\s)${qualifiers}${escapedItem}${suffixes}(?:$|\\s|,|\\()`, 'i');
        
        if (regex.test(normalizedName)) {
          console.log(`Matched pantry item "${pantryItem}" in "${normalizedName}"`);
          return true;
        }
      }
    }
  }
  return false;
}

// Helper to normalize measurements for consolidation
function normalizeMeasurement(value, unit) {
  // Convert everything to a common unit for each type
  const conversions = {
    // Volume to ml
    'ml': 1,
    'l': 1000,
    'tsp': 4.93,
    'tbsp': 14.79,
    'cup': 236.59,
    'floz': 29.57,
    // Weight to g
    'g': 1,
    'kg': 1000,
    'oz': 28.35,
    'lb': 453.59,
    // Count
    'each': 1,
    'small': 1,
    'medium': 1.5,
    'large': 2,
    'clove': 1,
    'bunch': 1
  };

  const unit_normalized = unit.toLowerCase().replace('.', '').trim();
  const multiplier = conversions[unit_normalized] || 1;
  return value * multiplier;
}

module.exports = {
  PANTRY_ITEMS,
  DEFAULT_PANTRY_SETTINGS,
  isPantryItem,
  normalizeMeasurement
}; 