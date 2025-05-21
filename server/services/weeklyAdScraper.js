const axios = require('axios');

class WeeklyAdScraper {
  constructor() {
    this.baseUrl = 'https://www.albertsons.com';
    this.client = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      }
    });
  }

  async getWeeklyAd(zipCode = '89113') {
    try {
      console.log('Using mock weekly ad data for testing...');
      return this.getMockDeals();
    } catch (error) {
      console.error('Weekly ad error:', error);
      return this.getMockDeals();
    }
  }

  getMockDeals() {
    return {
      protein: [
        { description: 'Chicken Breast Value Pack', price: '$2.99/lb', savings: '$2.00' },
        { description: 'Ground Beef 80/20', price: '$3.99/lb', savings: '$1.00' },
        { description: 'Salmon Fillets', price: '$8.99/lb', savings: '$3.00' }
      ],
      produce: [
        { description: 'Fresh Broccoli', price: '$0.99/lb', savings: '$0.50' },
        { description: 'Baby Spinach 1lb', price: '$4.99', savings: '$2.00' },
        { description: 'Bananas', price: '$0.49/lb', savings: '$0.10' }
      ],
      dairy: [
        { description: 'Large Eggs 18ct', price: '$2.99', savings: '$1.00' },
        { description: 'Milk 1 Gallon', price: '$3.49', savings: '$0.50' },
        { description: 'Greek Yogurt 32oz', price: '$4.99', savings: '$1.00' }
      ],
      pantry: [
        { description: 'Pasta 16oz', price: '$1.49', savings: '$0.50' },
        { description: 'Brown Rice 2lb', price: '$2.99', savings: '$1.00' },
        { description: 'Canned Beans 15oz', price: '$0.89', savings: '$0.40' }
      ]
    };
  }
}

module.exports = WeeklyAdScraper; 