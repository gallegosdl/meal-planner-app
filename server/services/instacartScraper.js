const puppeteerExtra = require('puppeteer-extra');
const puppeteer = require('puppeteer');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Add stealth plugin
puppeteerExtra.use(StealthPlugin());

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

  async initialize() {
    try {
      console.log('🚀 Initializing Puppeteer...');
      
      // Use the actual Chrome path from the build logs
      const executablePath = '/root/.cache/puppeteer/chrome/linux-136.0.7103.94/chrome-linux64/chrome';
      console.log('📍 Using Chrome at:', executablePath);

      // Verify the binary
      try {
        const chromeVersion = execSync(`${executablePath} --version`).toString();
        console.log('✅ Chrome version:', chromeVersion);
      } catch (error) {
        console.error('❌ Failed to get Chrome version:', error.message);
      }

      this.browser = await puppeteerExtra.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      console.log('✅ Browser launched successfully');
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 800 });

      await this.page.setRequestInterception(true);
      this.page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      return true;
    } catch (error) {
      console.error('🔥 Scraper initialization failed:', error);
      throw error;
    }
  }

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
          await this.switchStore(storeName);
          const storeResult = await this.scrapeItems();
          results.stores[storeName] = this.formatStoreData(storeResult);
        } catch (error) {
          console.error(`❌ Failed to process ${storeName}:`, error);
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

  async switchStore(storeName) {
    try {
      console.log(`Switching to ${storeName}...`);
      await this.page.waitForSelector('[aria-label="show retailer chooser modal"]');
      await this.page.click('[aria-label="show retailer chooser modal"]');
      await this.page.waitForTimeout(1000);

      const storeButton = await this.page.$x(`//button[contains(., '${storeName}')]`);
      if (storeButton.length > 0) {
        await storeButton[0].click();
      } else {
        throw new Error(`Could not find store: ${storeName}`);
      }

      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      await this.page.waitForTimeout(2000);
      console.log(`✅ Switched to ${storeName}`);
    } catch (error) {
      console.error(`Failed to switch to ${storeName}:`, error);
      throw error;
    }
  }

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

  async scrapeItems() {
    try {
      await this.page.waitForSelector('body', { timeout: 10000 });
      await new Promise(r => setTimeout(r, 5000));

      const storeInfo = await this.page.evaluate(() => {
        const selectors = [
          'span[class="e-1mk109q"]',
          'div[aria-label="show retailer chooser modal"] span',
          '.store-header__store-name',
          '.store-name',
          '.retailer-name',
          'h1[class*="store"]',
          'div[class*="store-name"]'
        ];

        let storeName = 'Unknown Store';
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = el.textContent.trim();
            if (text && text !== 'Unknown Store') {
              storeName = text;
              break;
            }
          }
        }

        return {
          name: storeName,
          url: window.location.href,
          originalUrl: window.location.href
        };
      });

      console.log('Found store info:', storeInfo);

      const items = await this.page.evaluate(() => {
        const results = [];
        const itemElements = document.querySelectorAll('ul.e-19tvapz > li');

        itemElements.forEach((item, index) => {
          try {
            const nameEl = item.querySelector('.e-10y4wp7');
            const name = nameEl?.textContent?.trim() || '';

            const allPriceElements = item.querySelectorAll('span[class^="e-"]');
            let priceText = '';
            for (const el of allPriceElements) {
              const text = el.textContent.trim();
              if (text.includes('$') || /^\d+$/.test(text)) {
                priceText = text;
                break;
              }
            }

            let price = 0;
            if (priceText) {
              const cleanPrice = priceText.replace(/[^\d]/g, '');
              if (cleanPrice.length > 0) {
                const cents = cleanPrice.slice(-2);
                const dollars = cleanPrice.slice(0, -2) || '0';
                price = parseFloat(`${dollars}.${cents}`);
              }
            }

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

      let total = 0;
      items.forEach(item => {
        total += item.price * item.quantity;
      });

      return {
        store: storeInfo,
        items,
        total
      };
    } catch (error) {
      console.error('Failed to scrape items:', error);
      await this.page.screenshot({ path: 'error-state.png', fullPage: true });
      throw error;
    }
  }

  analyzeBestValue(stores) {
    let bestStore = null;
    let bestScore = -1;

    for (const [storeName, data] of Object.entries(stores)) {
      const availabilityWeight = 0.3;
      const priceWeight = 0.7;

      const priceScore = 1 - (parseFloat(data.totalPrice) / 1000);
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

  async cleanup() {
    try {
      if (this.browser) {
        console.log('🧹 Closing browser...');
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

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
