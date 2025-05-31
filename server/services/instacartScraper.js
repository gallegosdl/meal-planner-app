const puppeteer = require('puppeteer');
const { setTimeout } = require('timers/promises');

// Constants for configuration
const SCRAPER_CONFIG = {
  TIMEOUT: 10000,
  STORE_SWITCH_DELAY: 3000,
  SCROLL_INTERVAL: 1000,
  MAX_RETRIES: 3
};

class InstacartScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize browser and page with proper settings
   * @private
   */
  async initialize() {
    console.log('Scraper: Initializing browser');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();

    // Add request interception for performance
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => {
      if (req.resourceType() === 'image' || req.resourceType() === 'stylesheet') {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  /**
   * Scrape prices from multiple stores
   * @param {string} shoppingUrl - Instacart shopping list URL
   * @param {string[]} targetStores - Array of store names to check
   * @returns {Promise<Object>} Comparison results
   */
  async scrapePrices(shoppingUrl, targetStores) {
    try {
      await this.initialize();
      await this.page.goto(shoppingUrl, { 
        waitUntil: 'networkidle2',
        timeout: SCRAPER_CONFIG.TIMEOUT 
      });

      const results = {
        timestamp: new Date().toISOString(),
        stores: {},
        bestValue: null
      };

      for (const storeName of targetStores) {
        console.log(`🔄 Processing ${storeName}...`);
        const storeData = await this.scrapeStore(storeName);
        results.stores[storeName] = storeData;
      }

      // Determine best value store
      results.bestValue = this.analyzeBestValue(results.stores);

      return results;
    } catch (error) {
      console.error('Scraping failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Scrape data for a specific store
   * @private
   */
  async scrapeStore(storeName) {
    let retries = 0;
    while (retries < SCRAPER_CONFIG.MAX_RETRIES) {
      try {
        await this.switchStore(storeName);
        await this.scrollToBottom();

        const items = await this.page.evaluate(() => {
          return Array.from(document.querySelectorAll('[data-testid="item"]')).map(row => ({
            name: row.querySelector('[data-testid="item-name"]')?.innerText || 'Unknown',
            price: parseFloat(row.querySelector('[data-testid="price"]')?.innerText.replace(/[^0-9.]/g, '')) || 0,
            unit: row.querySelector('[data-testid="unit-price"]')?.innerText || '',
            available: !row.querySelector('[data-testid="out-of-stock"]'),
            organic: row.innerText.toLowerCase().includes('organic')
          }));
        });

        const unavailableItems = items.filter(item => !item.available);
        const total = items.reduce((acc, item) => acc + (item.available ? item.price : 0), 0);

        return {
          totalPrice: total.toFixed(2),
          itemCount: items.length,
          availableItems: items.filter(item => item.available),
          unavailableItems,
          availability: ((items.length - unavailableItems.length) / items.length * 100).toFixed(1),
          items
        };
      } catch (error) {
        retries++;
        if (retries === SCRAPER_CONFIG.MAX_RETRIES) throw error;
        await setTimeout(1000); // Wait before retry
      }
    }
  }

  /**
   * Switch to a different store
   * @private
   */
  async switchStore(storeName) {
    await this.page.waitForSelector('[data-testid="store-selector"]');
    await this.page.click('[data-testid="store-selector"]');
    
    const storeOption = await this.page.$(`[data-testid="store-option-${storeName}"]`);
    if (!storeOption) {
      throw new Error(`Store ${storeName} not found`);
    }
    
    await storeOption.click();
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
  }

  /**
   * Scroll to bottom to load all items
   * @private
   */
  async scrollToBottom() {
    await this.page.evaluate(async (interval) => {
      await new Promise((resolve) => {
        const distance = 100;
        const delay = interval;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, delay);
      });
    }, SCRAPER_CONFIG.SCROLL_INTERVAL);
  }

  /**
   * Analyze results to find best value store
   * @private
   */
  analyzeBestValue(stores) {
    let bestStore = null;
    let bestScore = -1;

    for (const [storeName, data] of Object.entries(stores)) {
      // Score based on price and availability
      const availabilityWeight = 0.3;
      const priceWeight = 0.7;
      
      const priceScore = 1 - (parseFloat(data.totalPrice) / 1000); // Normalize price
      const availabilityScore = parseFloat(data.availability) / 100;
      
      const score = (priceScore * priceWeight) + (availabilityScore * availabilityWeight);
      
      if (score > bestScore) {
        bestScore = score;
        bestStore = {
          name: storeName,
          totalPrice: data.totalPrice,
          availability: data.availability,
          score: score.toFixed(2)
        };
      }
    }

    return bestStore;
  }

  /**
   * Cleanup resources
   * @private
   */
  async cleanup() {
    if (this.browser) {
      console.log('Scraper: Cleaning up browser');
      await this.browser.close();
    }
  }
}

module.exports = InstacartScraper; 