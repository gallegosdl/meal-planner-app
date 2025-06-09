const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { DEFAULT_PANTRY_SETTINGS } = require('../config/pantryConfig');

const SCRAPER_CONFIG = {
  TIMEOUT: 60000,
  STORE_SWITCH_DELAY: 5000,
  SCROLL_INTERVAL: 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 3000
};

function logChromiumLocations() {
  // Common locations for Puppeteer Chromium
  const possibleDirs = [
    '/root/.cache/puppeteer/chrome',
    '/opt/render/.cache/puppeteer/chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
  ];
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      console.log(`[DEBUG] Chromium possible dir found: ${dir}`);
      // List files in this directory for debug
      try {
        const entries = fs.readdirSync(dir);
        console.log(`[DEBUG] Contents of ${dir}:`, entries);
      } catch (e) {
        // no-op
      }
    }
  }
}

class InstacartScraper {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.pantrySettings = {
      ...DEFAULT_PANTRY_SETTINGS,
      ...options.pantrySettings
    };
    this.options = options;
  }

  /*async initialize() {
    try {
      console.log('🚀 Initializing Puppeteer...');
      console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);

      logChromiumLocations();

      let chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      if (!chromiumPath) {
        const defaultPath = '/root/.cache/puppeteer/chrome/linux-1108766/chrome';
        if (fs.existsSync(defaultPath)) {
          chromiumPath = defaultPath;
        }
      }

      if (chromiumPath && !fs.existsSync(chromiumPath)) {
        throw new Error(`[FATAL] Chromium binary not found at expected path: ${chromiumPath}`);
      }
      if (!chromiumPath) {
        console.warn('[WARN] No Chromium executable path found, Puppeteer will use default.');
      } else {
        console.log(`[DEBUG] Chromium binary will be used from: ${chromiumPath}`);
      }*/ 

      /*this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ],
        executablePath: chromiumPath || undefined,
        protocolTimeout: 120000, // Increase protocol timeout to 2 minutes
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      });

      console.log('✅ Browser launched successfully');
      this.page = await this.browser.newPage();
      
      // Set default timeout for all operations
      this.page.setDefaultTimeout(120000); // 2 minutes
      this.page.setDefaultNavigationTimeout(120000); // 2 minutes
      
      await this.page.setViewport({ width: 1920, height: 1080 });

      // Enable request interception
      await this.page.setRequestInterception(true);
      this.page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Add error handling for page crashes
      this.page.on('error', err => {
        console.error('Page crashed:', err);
      });

      this.page.on('pageerror', err => {
        console.error('Page error:', err);
      });

      return true;
    } catch (error) {
      console.error('🔥 Scraper initialization failed:', error);
      throw error;
    }
  }*/

    async initialize() {
      try {
        console.log('🚀 Initializing Puppeteer...');
        console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
    
        logChromiumLocations();
    
        const isRender = process.env.RENDER === 'true';
        let chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    
        if (!chromiumPath && isRender) {
          const renderPath = '/opt/render/.cache/puppeteer/chrome/linux-1108766/chrome';
          if (fs.existsSync(renderPath)) {
            chromiumPath = renderPath;
            console.log(`[RENDER] Using Chromium at ${chromiumPath}`);
          } else {
            throw new Error(`[RENDER] Expected Chromium not found at ${renderPath}`);
          }
        }
    
        const launchOptions = {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920x1080'
          ],
          defaultViewport: {
            width: 1920,
            height: 1080
          }
        };
    
        if (chromiumPath) {
          if (!fs.existsSync(chromiumPath)) {
            throw new Error(`[FATAL] Chromium binary not found at expected path: ${chromiumPath}`);
          }
          launchOptions.executablePath = chromiumPath;
          console.log(`[DEBUG] Chromium binary will be used from: ${chromiumPath}`);
        } else {
          console.warn('[WARN] No Chromium executable path found, Puppeteer will use default.');
        }
    
        this.browser = await puppeteer.launch(launchOptions);
        console.log('✅ Browser launched successfully');
    
        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(120000);
        this.page.setDefaultNavigationTimeout(120000);
        await this.page.setViewport({ width: 1920, height: 1080 });
    
        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
          if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
            req.abort();
          } else {
            req.continue();
          }
        });
    
        this.page.on('error', err => console.error('Page crashed:', err));
        this.page.on('pageerror', err => console.error('Page error:', err));
    
        return true;
      } catch (error) {
        console.error('🔥 Scraper initialization failed:', error);
        throw error;
      }
    }

  async scrapePrices(shoppingUrl, targetStores) {
    try {
      await this.initialize();
      
      // Navigate to the base shopping list URL without any store parameter
      const baseUrl = shoppingUrl.split('?')[0]; // Remove any query parameters
      console.log('Navigating to shopping list:', baseUrl);
      
      await this.page.goto(baseUrl, {
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
          results.stores[storeName] = {
            error: error.message,
            totalPrice: '0.00',
            itemCount: 0,
            availableItems: [],
            unavailableItems: [],
            availability: '0'
          };
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
    let retryCount = 0;
    
    // Normalize store names by removing special characters, spaces, and common suffixes
    const normalizeStoreName = (name) => {
      return name.toLowerCase()
        .replace(/\s*(delivery|pickup)\s*available/gi, '') // Remove "Delivery available" and "Pickup available"
        .replace(/['\s-]/g, '') // Remove apostrophes, spaces, and hyphens
        .replace(/&/g, 'and')   // Replace & with 'and'
        .trim();
    };

    while (retryCount < SCRAPER_CONFIG.MAX_RETRIES) {
      try {
        console.log(`Switching to ${storeName}... (Attempt ${retryCount + 1}/${SCRAPER_CONFIG.MAX_RETRIES})`);
        
        // Wait for the store chooser button
        const storeChooserSelector = '[aria-label="show retailer chooser modal"]';
        await this.page.waitForSelector(storeChooserSelector, {
          visible: true,
          timeout: SCRAPER_CONFIG.TIMEOUT
        });

        // Click the store chooser button
        await this.page.click(storeChooserSelector);
        
        // Wait for modal to appear and store buttons to be loaded
        console.log('Waiting for store chooser modal...');
        await this.page.waitForSelector('[data-testid="retailers-chooser-modal-tile"]', {
          visible: true,
          timeout: SCRAPER_CONFIG.TIMEOUT
        });

        // Give the modal time to fully render and stabilize
        await this.page.waitForTimeout(3000);

        // Find and click the store button using normalized text comparison
        const targetNormalized = normalizeStoreName(storeName);
        console.log('Target normalized store name:', targetNormalized);
        
        const matchingStore = await this.page.evaluate((targetNormalized) => {
          // Helper function to normalize store names (must be defined inside evaluate)
          const normalizeStoreName = (name) => {
            return name.toLowerCase()
              .replace(/\s*(delivery|pickup)\s*available/gi, '') // Remove "Delivery available" and "Pickup available"
              .replace(/['\s-]/g, '') // Remove apostrophes, spaces, and hyphens
              .replace(/&/g, 'and')   // Replace & with 'and'
              .trim();
          };

          // Get all store tiles from the modal
          const storeTiles = Array.from(document.querySelectorAll('[data-testid="retailers-chooser-modal-tile"]'));
          console.log(`Found ${storeTiles.length} store tiles`);
          
          for (const tile of storeTiles) {
            // Get the store name text, excluding any "Show alternatives" buttons
            const storeNameElement = tile.querySelector('.e-1mkl09q, [data-testid="retailer-name"]');
            if (!storeNameElement) continue;
            
            const storeText = storeNameElement.textContent.trim();
            if (!storeText || storeText === 'Show alternatives') continue;
            
            const normalizedText = normalizeStoreName(storeText);
            console.log(`Comparing store: ${storeText} -> ${normalizedText} (target: ${targetNormalized})`);
            
            if (normalizedText === targetNormalized) {
              // Find the clickable element within the tile
              const clickableElement = tile.querySelector('[role="button"]') || tile;
              clickableElement.click();
              return storeText;
            }
          }
          return null;
        }, targetNormalized);

        if (!matchingStore) {
          // Get a clean list of actual store names for the error message
          const availableStores = await this.page.evaluate(() => {
            const stores = new Set();
            document.querySelectorAll('[data-testid="retailers-chooser-modal-tile"]').forEach(tile => {
              const nameEl = tile.querySelector('.e-1mkl09q, [data-testid="retailer-name"]');
              if (nameEl) {
                const name = nameEl.textContent.trim();
                if (name && name !== 'Show alternatives') {
                  stores.add(name);
                }
              }
            });
            return Array.from(stores);
          });
          throw new Error(`Store ${storeName} not found. Available stores: ${availableStores.join(', ')}`);
        }

        console.log(`Found and clicked store: ${matchingStore}`);

        // Wait for the modal to close
        await this.page.waitForFunction(
          () => !document.querySelector('[data-testid="retailers-chooser-modal-tile"]'),
          { timeout: SCRAPER_CONFIG.TIMEOUT }
        );

        // Wait for store switch to complete
        await this.page.waitForTimeout(SCRAPER_CONFIG.STORE_SWITCH_DELAY);

        // Verify the store switch was successful
        const finalStoreElement = await this.page.$('.e-1mkl09q, [data-testid="retailer-name"]');
        if (!finalStoreElement) {
          throw new Error('Could not find store name element after switching');
        }

        const finalStore = await this.page.evaluate(el => el.textContent.trim(), finalStoreElement);
        const finalStoreNormalized = normalizeStoreName(finalStore);
        
        if (!finalStoreNormalized.includes(targetNormalized)) {
          throw new Error(`Failed to switch to ${storeName}. Current store: ${finalStore}`);
        }

        console.log(`✅ Successfully switched to ${finalStore}`);
        return;
        
      } catch (error) {
        retryCount++;
        console.error(`Failed to switch to ${storeName} (Attempt ${retryCount}/${SCRAPER_CONFIG.MAX_RETRIES}):`, error);
        
        if (retryCount < SCRAPER_CONFIG.MAX_RETRIES) {
          console.log(`Retrying in ${SCRAPER_CONFIG.RETRY_DELAY}ms...`);
          await this.page.waitForTimeout(SCRAPER_CONFIG.RETRY_DELAY);
          await this.page.screenshot({ 
            path: `store-switch-attempt-${retryCount}-${Date.now()}.png`,
            fullPage: true 
          });
          await this.page.reload({ waitUntil: 'networkidle2', timeout: SCRAPER_CONFIG.TIMEOUT });
        } else {
          await this.page.screenshot({ 
            path: `store-switch-final-error-${Date.now()}.png`,
            fullPage: true 
          });
          throw error;
        }
      }
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
      console.log('\n🛒 Starting item scraping...');
      
      // Wait for the page to be ready
      await this.page.waitForSelector('body', { timeout: SCRAPER_CONFIG.TIMEOUT });
      
      // Wait for items to load using the ingredient-item-card selector
      console.log('Waiting for item list to load...');
      await this.page.waitForSelector('[data-testid="ingredient-item-card"]', {
        timeout: SCRAPER_CONFIG.TIMEOUT,
        visible: true
      });

      // Get current store name
      const storeInfo = await this.page.evaluate(() => {
        const storeElement = document.querySelector('[data-testid="retailer-name"]');
        return {
          name: storeElement ? storeElement.textContent.trim() : 'Unknown Store',
          url: window.location.href,
          originalUrl: window.location.href
        };
      });

      console.log('Current store:', storeInfo);

      // Scroll to load all items
      console.log('Scrolling to load all items...');
      await this.scrollToBottom();
      
      // Wait for any lazy-loaded content
      await this.page.waitForTimeout(3000);

      let items = [];
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries && items.length === 0) {
        console.log(`Extracting items (attempt ${retryCount + 1}/${maxRetries})...`);
        
        items = await this.page.evaluate(() => {
          const results = [];
          const itemCards = Array.from(document.querySelectorAll('[data-testid="ingredient-item-card"]'));

          for (const card of itemCards) {
            try {
              const recipeInfo = card.querySelector('.e-10y4wp7')?.textContent.trim() || '';
              const productName = card.querySelector('[title]')?.getAttribute('title') || '';
              
              // Get price from screen reader text first
              let price = 0;
              let priceText = '';
              const screenReaderPrice = card.querySelector('.screen-reader-only')?.textContent.match(/\$(\d+\.\d{2})/);
              
              if (screenReaderPrice) {
                price = parseFloat(screenReaderPrice[1]);
                priceText = screenReaderPrice[0];
              } else {
                const dollarElement = card.querySelector('.e-1qkvt8e');
                const centsElement = card.querySelector('.e-p745l:last-child');
                
                if (dollarElement && centsElement) {
                  const dollars = dollarElement.textContent.trim();
                  const cents = centsElement.textContent.trim();
                  price = parseFloat(`${dollars}.${cents}`);
                  priceText = `$${dollars}.${cents}`;
                }
              }

              results.push({
                name: productName,
                price,
                rawPrice: priceText,
                display_text: recipeInfo || productName
              });

            } catch (err) {
              console.error('Error parsing item:', err);
            }
          }
          return results;
        });

        if (items.length === 0 && retryCount < maxRetries - 1) {
          console.log('No items found, waiting and retrying...');
          await this.page.waitForTimeout(3000);
          await this.scrollToBottom();
          retryCount++;
        } else {
          break;
        }
      }

      // Log the results
      console.log('\n📋 Processing Results:');
      console.log(`Original items: ${items.length}`);
      
      console.log('\n🛒 Final Shopping List:');
      items.forEach(item => {
        console.log(`${item.display_text} - ${item.rawPrice}`);
      });

      return {
        store: storeInfo,
        items: items,
        total: items.reduce((sum, item) => sum + (item.price || 0), 0)
      };
    } catch (error) {
      console.error('Failed to scrape items:', error);
      await this.page.screenshot({ 
        path: `scraping-error-${Date.now()}.png`,
        fullPage: true 
      });
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

// Export the class and configurations
module.exports = InstacartScraper;
module.exports.SCRAPER_CONFIG = SCRAPER_CONFIG;