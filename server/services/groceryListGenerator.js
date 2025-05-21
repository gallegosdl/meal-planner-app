class GroceryListGenerator {
  constructor(weeklyDeals) {
    this.deals = weeklyDeals;
  }

  generateGroceryList() {
    // Convert deals into a flat list of ingredients with details
    const groceryList = {
      ingredients: [],
      totalCost: 0,
      totalSavings: 0,
      byCategory: {
        protein: [],
        produce: [],
        dairy: [],
        pantry: []
      }
    };

    // Process each category
    Object.entries(this.deals).forEach(([category, items]) => {
      items.forEach(item => {
        const ingredient = {
          name: this.cleanIngredientName(item.description),
          category,
          price: this.parsePrice(item.price),
          pricePerUnit: this.getPricePerUnit(item.price),
          unit: this.extractUnit(item.price),
          savings: this.parseSavings(item.savings),
          original: item
        };

        groceryList.ingredients.push(ingredient);
        groceryList.byCategory[category].push(ingredient);
        groceryList.totalCost += ingredient.price;
        groceryList.totalSavings += ingredient.savings;
      });
    });

    return groceryList;
  }

  cleanIngredientName(description) {
    // Remove price info and clean up the name
    return description
      .replace(/\$\d+\.?\d*/g, '')
      .replace(/(per|\/)\s*(lb|pound|oz|ounce)/gi, '')
      .replace(/save/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  parsePrice(price) {
    const match = price.match(/\$(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  parseSavings(savings) {
    const match = savings?.match(/\$(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  getPricePerUnit(price) {
    const match = price.match(/\$(\d+\.?\d*)\s*\/\s*(lb|pound|oz|ounce)/i);
    if (match) {
      return {
        amount: parseFloat(match[1]),
        unit: match[2].toLowerCase()
      };
    }
    return null;
  }

  extractUnit(price) {
    const match = price.match(/(lb|pound|oz|ounce)/i);
    return match ? match[1].toLowerCase() : 'unit';
  }

  getOpenAIFormat() {
    const groceryList = this.generateGroceryList();
    
    return {
      available_ingredients: groceryList.ingredients.map(ingredient => ({
        name: ingredient.name,
        category: ingredient.category,
        price_per_unit: ingredient.pricePerUnit || { amount: ingredient.price, unit: 'unit' },
        on_sale: ingredient.savings > 0
      })),
      budget_constraints: {
        total_budget: 100, // Can be adjusted
        max_price_per_meal: 15
      },
      dietary_preferences: {
        categories_distribution: {
          protein: '25-30%',
          produce: '30-40%',
          dairy: '15-20%',
          pantry: '15-20%'
        }
      }
    };
  }
}

module.exports = GroceryListGenerator; 