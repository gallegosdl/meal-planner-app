const InstacartScraper = require('../services/instacartScraper');
require('dotenv').config();

async function testScraper() {
  let scraper = null;
  
  try {
    console.log('Starting scraper test...');
    
    const listUrl = 'https://customers.dev.instacart.tools/store/shopping_lists/5895574';
    console.log('List URL:', listUrl);

    scraper = new InstacartScraper();
    await scraper.initialize();
    
    const page = scraper.page;
    console.log('Navigating to page...');

    // Simple navigation with longer timeout
    await page.goto(listUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 90000 // 90 seconds
    });

    // Wait for content to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Page loaded, current URL:', page.url());

    const result = await scraper.scrapeItems();
    
    if (!result.items || result.items.length === 0) {
      console.log('\nNo items found');
    } else {
      console.log('\nFound Items:', result.items.length);
      console.log('Store:', result.store.name);
      
      let total = 0;
      result.items.forEach(item => {
        if (item.name && item.price > 0) {
          console.log(`${item.name}: $${item.price.toFixed(2)} x ${item.quantity}`);
          total += item.price * item.quantity;
        }
      });
      console.log('\nTotal: $' + total.toFixed(2));
    }

  } catch (error) {
    console.error('Test failed:', error);
    if (scraper?.page) {
      await scraper.page.screenshot({ path: 'error.png' });
    }
    throw error;
  } finally {
    if (scraper) await scraper.cleanup();
  }
}

testScraper().catch(console.error); 