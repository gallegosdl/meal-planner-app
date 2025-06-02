const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add stealth plugin and initialize
puppeteer.use(StealthPlugin());

// Constants for configuration
const SCRAPER_CONFIG = {
  TIMEOUT: 30000,
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
    try {
      console.log('Scraper: Starting browser initialization');
      console.log('Chromium path used by Puppeteer:', puppeteer.executablePath());
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Block images only
      await this.page.setRequestInterception(true);
      this.page.on('request', (req) => {
        if (req.resourceType() === 'image') {
          req.abort();
        } else {
          req.continue();
        }
      });

      return true;
    } catch (error) {
      console.error('Scraper initialization failed:', error);
      throw error;
    }
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
        try {
          console.log(`🔄 Processing ${storeName}...`);
          await this.switchStore(storeName); // Switch to each store
          const storeResult = await this.scrapeItems();
          results.stores[storeName] = this.formatStoreData(storeResult);
        } catch (error) {
          console.error(`Failed to process ${storeName}:`, error);
          // Continue with next store if one fails
        }
      }

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

        // Updated selectors based on the actual page
        const items = await this.scrapeItems();

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
        console.log('Scraping attempt failed:', error.message);
        retries++;
        if (retries === SCRAPER_CONFIG.MAX_RETRIES) throw error;
        await new Promise(resolve => global.setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Switch to a different store
   * @private
   */
  async switchStore(storeName) {
    try {
      console.log(`Switching to ${storeName}...`);
      
      // Wait for and click the store selector modal button
      await this.page.waitForSelector('[aria-label="show retailer chooser modal"]');
      await this.page.click('[aria-label="show retailer chooser modal"]');
      
      // Wait for store list to appear and find our store
      await this.page.waitForTimeout(1000); // Give modal time to open
      
      // Click the store name - using a more flexible selector
      const storeButton = await this.page.$x(`//button[contains(., '${storeName}')]`);
      if (storeButton.length > 0) {
        await storeButton[0].click();
      } else {
        throw new Error(`Could not find store: ${storeName}`);
      }
      
      // Wait for navigation and content to load
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      await this.page.waitForTimeout(2000); // Give prices time to load
      
      console.log(`Successfully switched to ${storeName}`);
    } catch (error) {
      console.error(`Failed to switch to ${storeName}:`, error);
      throw error;
    }
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
   * Scrape items from the current page
   * @private
   */
  async scrapeItems() {
    try {
      // Wait for any content to load
      await this.page.waitForSelector('body', { timeout: 10000 });
      await new Promise(r => setTimeout(r, 5000));

      // First get store info
      const storeInfo = await this.page.evaluate(() => {
        // Look for store name in the retailer chooser or modal
        const storeNameSelectors = [
          // Direct store name in span
          'span[class="e-1mk109q"]',
          // Modal button text
          'div[aria-label="show retailer chooser modal"] span',
          // Fallbacks
          '.store-header__store-name',
          '.store-name',
          '.retailer-name',
          'h1[class*="store"]',
          'div[class*="store-name"]'
        ];

        let storeName = 'Unknown Store';
        for (const selector of storeNameSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = el.textContent.trim();
            if (text && text !== 'Unknown Store') {
              storeName = text;
              break;
            }
          }
        }

        // Add debug logging
        console.log('Store selectors found:', 
          storeNameSelectors.map(s => ({
            selector: s,
            found: !!document.querySelector(s),
            text: document.querySelector(s)?.textContent?.trim()
          }))
        );

        return {
          name: storeName,
          url: window.location.href,
          originalUrl: window.location.href // Keep track of initial URL
        };
      });

      // Log store info for debugging
      console.log('Found store info:', storeInfo);

      // Now get items with the working logic
      const items = await this.page.evaluate(() => {
        const results = [];
        const itemElements = document.querySelectorAll('ul.e-19tvapz > li');
        
        itemElements.forEach((item, index) => {
          try {
            const nameEl = item.querySelector('.e-10y4wp7');
            const name = nameEl?.textContent?.trim() || '';

            // Get price
            const allPriceElements = item.querySelectorAll('span[class^="e-"]');
            let priceText = '';
            for (const el of allPriceElements) {
              const text = el.textContent.trim();
              if (text.includes('$') || /^\d+$/.test(text)) {
                priceText = text;
                break;
              }
            }

            // Parse price - handle numbers without decimal point
            let price = 0;
            if (priceText) {
              const cleanPrice = priceText.replace(/[^\d]/g, '');
              if (cleanPrice.length > 0) {
                const cents = cleanPrice.slice(-2);
                const dollars = cleanPrice.slice(0, -2) || '0';
                price = parseFloat(`${dollars}.${cents}`);
              }
            }

            // Get quantity
            const quantityText = item.querySelector('.e-1nljhj5')?.textContent?.trim() || '1';
            const quantity = parseInt(quantityText) || 1;

            results.push({
              name,
              price,
              quantity,
              rawPrice: priceText
            });
          } catch (err) {
            console.error(`Error parsing item ${index}:`, err);
          }
        });

        return results;
      });

      // Calculate total
      let total = 0;
      items.forEach(item => {
        total += item.price * item.quantity;
      });

      // Combine store info and items into result object
      const result = {
        store: storeInfo,
        items: items,
        total: total
      };

      // Log results
      console.log('\nStore:', result.store.name);
      console.log('\nDetailed item results:');
      items.forEach((item, i) => {
        console.log(`Item ${i + 1}: ${item.name} - $${item.price.toFixed(2)} x ${item.quantity} (Raw: ${item.rawPrice})`);
      });
      console.log(`\nTotal: $${total.toFixed(2)}`);

      return result;

    } catch (error) {
      console.error('Failed to scrape items:', error);
      await this.page.screenshot({ path: 'error-state.png', fullPage: true });
      throw error;
    }
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

  // Add method to format data for frontend
  formatStoreData(result) {
    return {
      totalPrice: result.total.toFixed(2),
      itemCount: result.items.length,
      availableItems: result.items.filter(item => item.price > 0),
      unavailableItems: result.items.filter(item => item.price === 0),
      availability: (
        (result.items.filter(item => item.price > 0).length / result.items.length) * 100
      ).toFixed(0)
    };
  }
}

module.exports = InstacartScraper; 