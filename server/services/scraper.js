const express = require('express');
const puppeteer = require('puppeteer');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

router.use(limiter);

let browser;
let browserWSEndpoint;

// Initialize browser instance
async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    browserWSEndpoint = browser.wsEndpoint();
  }
  return browser;
}

// Cleanup on server shutdown
process.on('SIGINT', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit();
});

router.get('/search', async (req, res) => {
  let page;
  try {
    const { query } = req.query;
    await initBrowser();
    
    page = await browser.newPage();
    
    // Handle potential authentication
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
    });

    await page.goto(`https://www.albertsons.com/shop/search-results.html?q=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Handle potential modals or overlays
    try {
      await page.waitForSelector('.modal-dialog', { timeout: 5000 });
      await page.click('.modal-dialog .close-button');
    } catch (e) {
      console.log('No modal detected');
    }

    // Wait for product grid with increased timeout
    await page.waitForSelector('.product-item-wrapper', { timeout: 10000 });

    // Extract product data with updated selectors
    const products = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.product-item-wrapper')).map(product => {
        return {
          name: product.querySelector('.product-title')?.textContent?.trim(),
          price: product.querySelector('.product-price-con')?.textContent?.trim(),
          image: product.querySelector('.product-card__image-con img')?.src,
          details: product.querySelector('.product-description')?.textContent?.trim(),
          nutrition: {
            servingSize: product.querySelector('.nutrition-info')?.textContent?.trim()
          }
        };
      });
    });

    // Add debug logging
    console.log(`Found ${products.length} products for query: ${query}`);
    
    res.json({ 
      success: true,
      query,
      count: products.length,
      products 
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      query 
    });
  } finally {
    if (page) {
      await page.close();
    }
  }
});

// Get detailed product information
router.get('/product/:id', async (req, res) => {
  let page;
  try {
    const { id } = req.params;
    await initBrowser();
    
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(`https://www.albertsons.com/shop/product-details.${id}`, {
      waitUntil: 'networkidle0'
    });

    // Wait for nutrition panel to load
    await page.waitForSelector('.nutrition-panel', { timeout: 5000 });

    const productDetails = await page.evaluate(() => {
      return {
        name: document.querySelector('.product-name')?.textContent?.trim(),
        price: document.querySelector('.product-price')?.textContent?.trim(),
        nutrition: {
          calories: document.querySelector('.nutrition-calories')?.textContent?.trim(),
          protein: document.querySelector('.nutrition-protein')?.textContent?.trim(),
          carbs: document.querySelector('.nutrition-carbs')?.textContent?.trim(),
          fat: document.querySelector('.nutrition-fat')?.textContent?.trim(),
          servingSize: document.querySelector('.serving-size')?.textContent?.trim()
        },
        ingredients: document.querySelector('.ingredients-list')?.textContent?.trim()
      };
    });

    res.json(productDetails);

  } catch (error) {
    console.error('Product detail scraping error:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  } finally {
    if (page) {
      await page.close();
    }
  }
});

class ScraperService {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    // Browser setup code...
  }

  async setLocation(zipCode) {
    // Location setting code...
  }

  async searchProducts(query) {
    // Search functionality...
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

module.exports = router; 