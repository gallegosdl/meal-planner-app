const { PriceHistory } = require('../models');
const sequelize = require('sequelize');

class PriceAnalytics {
  async trackPrice(item, store, price, date = new Date()) {
    await PriceHistory.create({
      itemName: item.toLowerCase(),
      store,
      price,
      date
    });
  }

  async getPriceTrends(item, timeframe = '30d') {
    const trends = await PriceHistory.findAll({
      where: {
        itemName: item.toLowerCase(),
        date: {
          [sequelize.Op.gte]: this.getDateFromTimeframe(timeframe)
        }
      },
      attributes: [
        'store',
        [sequelize.fn('AVG', sequelize.col('price')), 'avgPrice'],
        [sequelize.fn('MIN', sequelize.col('price')), 'minPrice'],
        [sequelize.fn('MAX', sequelize.col('price')), 'maxPrice']
      ],
      group: ['store']
    });

    return this.analyzeTrends(trends);
  }

  getDateFromTimeframe(timeframe) {
    const now = new Date();
    const days = parseInt(timeframe);
    return new Date(now.setDate(now.getDate() - days));
  }

  analyzeTrends(priceData) {
    return priceData.map(store => ({
      store: store.store,
      currentPrice: store.get('avgPrice'),
      priceRange: {
        min: store.get('minPrice'),
        max: store.get('maxPrice')
      },
      priceVolatility: this.calculateVolatility(store),
      bestTimeToBuy: this.suggestBestTime(store)
    }));
  }

  calculateVolatility(priceHistory) {
    // Implement price volatility calculation
    return 'LOW'; // or 'MEDIUM' or 'HIGH'
  }

  suggestBestTime(priceHistory) {
    // Analyze patterns to suggest best time to buy
    return {
      dayOfWeek: 'Wednesday', // Example
      confidence: 0.85
    };
  }

  async getBulkBuyRecommendations(items) {
    const recommendations = [];
    for (const item of items) {
      const trends = await this.getPriceTrends(item);
      const avgPrice = trends.reduce((sum, t) => sum + t.currentPrice, 0) / trends.length;
      
      recommendations.push({
        item,
        shouldBuyInBulk: this.shouldBuyInBulk(trends, avgPrice),
        potentialSavings: this.calculateBulkSavings(trends, avgPrice)
      });
    }
    return recommendations;
  }

  shouldBuyInBulk(trends, avgPrice) {
    // Implement bulk buy decision logic
    return {
      recommendation: true,
      reason: 'Price trending upward'
    };
  }

  calculateBulkSavings(trends, avgPrice) {
    // Calculate potential savings from bulk purchase
    return {
      percentage: 15, // Example
      absolute: 5.99 // Example
    };
  }
}

module.exports = new PriceAnalytics(); 