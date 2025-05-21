const InstacartScraper = require('../services/instacartScraper');

async function testScraper() {
  const scraper = new InstacartScraper();
  
  try {
    // Test product search with deals
    console.log('Searching for chicken breast with deals...');
    const products = await scraper.searchProducts('chicken breast');
    console.log('Found products with deals:', JSON.stringify(products, null, 2));

    // Test getting all available deals
    console.log('\nGetting all available deals...');
    const deals = await scraper.getAvailableDeals();
    console.log('Found deals:', JSON.stringify(deals, null, 2));

    // Test getting deals by category
    console.log('\nGetting categorized deals...');
    const categorizedDeals = await scraper.getCategorizedDeals();
    console.log('Deals by category:', JSON.stringify(categorizedDeals, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testScraper(); 