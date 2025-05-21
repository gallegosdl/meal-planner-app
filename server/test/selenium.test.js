const SeleniumScraper = require('../services/seleniumScraper');

async function testSeleniumScraper() {
  const scraper = new SeleniumScraper({
    preferredStoreId: '1234' // Optional: Set preferred store
  });
  
  try {
    console.log('Initializing Selenium scraper...');
    await scraper.init();

    console.log('Searching for chicken breast...');
    const products = await scraper.searchProducts('chicken breast');
    
    // Get selected store info
    const storeInfo = await scraper.getSelectedStore();
    console.log('Selected store:', storeInfo);
    
    console.log('Found products:', JSON.stringify(products, null, 2));

  } catch (error) {
    console.error('Selenium test failed:', error);
  } finally {
    console.log('Closing browser...');
    await scraper.close();
  }
}

// Run the test
console.log('Starting Selenium test...');
testSeleniumScraper().catch(console.error); 