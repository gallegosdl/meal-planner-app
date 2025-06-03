const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Only add the stealth plugin once!
puppeteer.use(StealthPlugin());

const SCRAPER_CONFIG = {
  TIMEOUT: 30000,
  STORE_SWITCH_DELAY: 3000,
  SCROLL_INTERVAL: 1000,
  MAX_RETRIES: 3
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
  constructor() {
    this.browser = null;
    this.page = null;
  }

  // Trigger redeploy: 2025-06-03

  async initialize() {
    try {
      console.log('🚀 Initializing Puppeteer...');
      // Debug: Print PUPPETEER_EXECUTABLE_PATH env var
      console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);

      // Debug: List Chromium download locations
      logChromiumLocations();

      // Try to guess the Chromium executable path if not set
      let chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      if (!chromiumPath) {
        // Try default Puppeteer v19 location
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
      }

      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: chromiumPath || undefined
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

  // ... the rest of your class remains the same ...
  // (snipped for brevity)
}

module.exports = InstacartScraper;