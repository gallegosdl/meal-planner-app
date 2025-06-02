const puppeteerExtra = require('puppeteer-extra');
const puppeteer = require('puppeteer'); // Full version
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Inject stealth plugin
puppeteerExtra.use(StealthPlugin());

// This path is where Puppeteer installs Chrome when using `PUPPETEER_CACHE_DIR`
const DEFAULT_CHROME_PATH = '/opt/render/.cache/puppeteer/chrome/linux-136.0.7103.94/chrome-linux64/chrome';

// Dynamically resolve executablePath
let executablePath;
try {
  // Optional sanity check: verify that path exists without crashing deploy
  const fs = require('fs');
  if (fs.existsSync(DEFAULT_CHROME_PATH)) {
    console.log('✅ Chrome binary found at:', DEFAULT_CHROME_PATH);
    executablePath = DEFAULT_CHROME_PATH;
  } else {
    console.warn('⚠️ Chrome binary NOT found at expected path. Falling back to Puppeteer default.');
    executablePath = puppeteer.executablePath(); // fallback
  }
} catch (err) {
  console.error('🛑 Failed to verify Chrome binary. Defaulting...');
  executablePath = puppeteer.executablePath();
}

// Constants for configuration
const SCRAPER_CONFIG = {
  TIMEOUT: 30000,
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
      console.log('🚀 Initializing Puppeteer with:', executablePath);
      this.browser = await puppeteerExtra.launch({
        headless: true,
        executablePath,
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

      // Block image loading to save resources
      await this.page.setRequestInterception(true);
      this.page.on('request', (req) => {
        req.resourceType() === 'image' ? req.abort() : req.continue();
      });

      return true;
    } catch (error) {
      console.error('🔥 Scraper initialization failed:', error);
      throw error;
    }
  }

  // Your scrapePrices, switchStore, scrollToBottom, scrapeItems, analyzeBestValue, cleanup, and formatStoreData stay unchanged.
  // Assume they work and are already in the class. If you want, I can paste the rest, but you don't need to change them.
}

module.exports = InstacartScraper;
