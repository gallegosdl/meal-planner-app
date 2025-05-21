const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { Key } = require('selenium-webdriver');

class SeleniumScraper {
  constructor(preferences = {}) {
    this.driver = null;
    this.preferences = preferences;
  }

  async init() {
    const options = new chrome.Options()
      .addArguments('--start-maximized')
      .addArguments('--disable-blink-features=AutomationControlled')
      .addArguments('--disable-dev-shm-usage')
      .addArguments('--no-sandbox')
      .addArguments('--window-size=1920,1080')
      // Add these to bypass some protections
      .addArguments('--disable-web-security')
      .addArguments('--disable-features=IsolateOrigins,site-per-process');

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await this.driver.manage().setTimeouts({ 
      implicit: 10000,
      pageLoad: 30000,
      script: 30000 
    });
  }

  async waitForElement(selector, timeout = 10000) {
    try {
      await this.driver.wait(
        until.elementLocated(By.css(selector)),
        timeout
      );
      const element = await this.driver.findElement(By.css(selector));
      await this.driver.wait(
        until.elementIsVisible(element),
        timeout
      );
      return element;
    } catch (e) {
      console.log(`Could not find element: ${selector}`);
      return null;
    }
  }

  async selectClosestStore() {
    try {
      await this.driver.sleep(2000);
      
      // Wait for store list
      const storeList = await this.driver.wait(
        until.elementsLocated(By.css('.store-list-item')),
        10000,
        'Store list not found'
      );

      if (storeList.length > 0) {
        // Get store information
        const stores = await Promise.all(
          storeList.map(async store => ({
            element: store,
            distance: parseFloat(
              (await store.getText()).match(/(\d+\.?\d*)\s*mi/)?.[1] || '999'
            ),
            name: await store.getAttribute('aria-label')
          }))
        );

        // Find closest store
        const closest = stores.reduce((min, store) => 
          store.distance < min.distance ? store : min
        );

        console.log(`Selecting store: ${closest.name} (${closest.distance} miles)`);
        
        // Scroll to and click the store
        await this.driver.executeScript('arguments[0].scrollIntoView(true);', closest.element);
        await this.driver.sleep(500);
        await closest.element.click();
        
        // Wait for selection to take effect
        await this.driver.sleep(2000);
        return true;
      }
      return false;
    } catch (e) {
      console.log('Store selection failed:', e.message);
      return false;
    }
  }

  async searchProducts(query, zipCode = '89113') {
    try {
      console.log('Navigating to site...');
      await this.driver.get('https://www.albertsons.com');
      await this.driver.sleep(3000);

      // First try to handle the initial location modal
      try {
        console.log('Checking for initial location modal...');
        const initialModal = await this.waitForElement('#onboardingModal');
        if (initialModal) {
          console.log('Found initial location modal');
          const zipInput = await this.waitForElement('input[aria-label="Enter Zip Code, City or State"]');
          if (zipInput) {
            await zipInput.clear();
            await zipInput.sendKeys(zipCode);
            await this.driver.sleep(1000);
            await zipInput.sendKeys(Key.RETURN);
            
            // Wait for store list and select closest
            await this.driver.sleep(2000);
            await this.selectClosestStore();
          }
        }
      } catch (e) {
        console.log('No initial location modal found');
      }

      // If no initial modal, try the fulfillment address
      try {
        console.log('Checking fulfillment address...');
        const addressText = await this.driver.executeScript(`
          return document.querySelector('.s_nav_fulfillment_address-container')?.textContent || '';
        `);

        if (!addressText.includes(zipCode)) {
          console.log('Need to update location...');
          const addressButton = await this.waitForElement('.s_nav_fulfillment_address-container');
          if (addressButton) {
            await addressButton.click();
            await this.driver.sleep(1000);

            // Look for zip input in the modal
            const modalZipInput = await this.waitForElement('input[placeholder*="ZIP"], input[type="text"]');
            if (modalZipInput) {
              await modalZipInput.clear();
              await modalZipInput.sendKeys(zipCode);
              await this.driver.sleep(1000);
              await modalZipInput.sendKeys(Key.RETURN);
              
              // Wait for store list and select closest
              await this.driver.sleep(2000);
              await this.selectClosestStore();
            }
          }
        } else {
          console.log('Location already set correctly');
        }
      } catch (e) {
        console.log('Error handling location:', e.message);
      }

      // Wait for search to be ready
      await this.driver.sleep(3000);
      console.log('Looking for search input...');
      
      const searchBox = await this.driver.wait(
        until.elementLocated(By.css('input[type="search"]')),
        10000,
        'Search input not found'
      );

      // Make sure search is interactive
      await this.driver.wait(
        until.elementIsEnabled(searchBox),
        10000,
        'Search input not interactive'
      );

      console.log('Performing search...');
      await searchBox.clear();
      await searchBox.sendKeys(query);
      await this.driver.sleep(1000);
      await searchBox.sendKeys(Key.RETURN);

      // Wait for product grid with multiple selectors
      console.log('Waiting for results...');
      const productSelectors = [
        '.product-item-wrapper',
        '[data-qa="product-item"]',
        '.product-card'
      ];

      let products = [];
      for (const selector of productSelectors) {
        await this.driver.sleep(2000);
        products = await this.driver.executeScript(`
          return Array.from(document.querySelectorAll('${selector}')).map(item => ({
            name: item.querySelector('.product-title, [data-qa="product-title"]')?.textContent?.trim(),
            price: item.querySelector('.product-price, [data-qa="product-price"]')?.textContent?.trim(),
            image: item.querySelector('img')?.src,
            details: item.querySelector('.product-description, [data-qa="product-description"]')?.textContent?.trim()
          }));
        `);
        if (products.length > 0) break;
      }

      console.log(`Found ${products.length} products`);
      return products;

    } catch (error) {
      console.error('Selenium scraping failed:', error);
      await this.driver.takeScreenshot().then(
        (image) => require('fs').writeFileSync('error.png', image, 'base64')
      );
      throw error;
    }
  }

  async getSelectedStore() {
    try {
      const storeInfo = await this.driver.executeScript(`
        const addressElement = document.querySelector('.s_nav_fulfillment_address-container');
        const storeName = document.querySelector('.store-name')?.textContent?.trim();
        return {
          address: addressElement?.textContent?.trim(),
          name: storeName
        };
      `);
      return storeInfo;
    } catch (e) {
      console.log('Could not get store info:', e.message);
      return null;
    }
  }

  async close() {
    if (this.driver) {
      await this.driver.quit();
    }
  }

  // Add method to set preferences
  setPreferences(prefs) {
    this.preferences = {
      ...this.preferences,
      ...prefs
    };
  }

  async selectStore() {
    try {
      await this.driver.sleep(2000);
      
      // If we have a preferred store, try to find it first
      if (this.preferences.preferredStoreId) {
        const preferredStore = await this.driver.executeScript(`
          return document.querySelector('[data-store-id="${this.preferences.preferredStoreId}"]');
        `);
        
        if (preferredStore) {
          console.log('Found preferred store, selecting...');
          await this.driver.executeScript('arguments[0].click();', preferredStore);
          return true;
        }
      }

      // Fall back to closest store if no preference or preferred store not found
      return await this.selectClosestStore();
    } catch (e) {
      console.log('Store selection failed:', e.message);
      return false;
    }
  }

  async performRecordedSteps() {
    // Example of recorded steps
    await this.driver.get('https://www.albertsons.com');
    await this.driver.sleep(2000);
    
    // Click zip code button (recorded selector)
    await this.driver.findElement(By.css('#openFulfillmentModalButton')).click();
    await this.driver.sleep(1000);
    
    // Enter zip code (recorded selector)
    const zipInput = await this.driver.findElement(By.css('#fulfillment-modal input[type="text"]'));
    await zipInput.sendKeys('89113');
    await this.driver.sleep(500);
    await zipInput.sendKeys(Key.RETURN);
    
    // Select store (recorded selector)
    await this.driver.wait(
      until.elementLocated(By.css('.store-list-item:first-child')),
      5000
    ).click();
    
    // Wait for search to be ready
    await this.driver.sleep(2000);
  }
}

module.exports = SeleniumScraper; 