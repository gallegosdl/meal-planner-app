const InstacartScraper = require('../services/instacartScraper');

// You'll need to get an API key from Instacart Platform Portal
const API_KEY = process.env.INSTACART_API_KEY;

async function testInstacart() {
    const scraper = new InstacartScraper(API_KEY);
    
    try {
        // First find nearby stores
        console.log('Finding nearby stores...');
        const stores = await scraper.searchStores('89113');
        if (!stores.length) {
            throw new Error('No stores found');
        }
        const store = stores[0];
        console.log(`Using store: ${store.name}`);

        // Get deals for this store
        console.log('\nGetting store deals...');
        const deals = await scraper.getDeals(store.id);
        console.log(`Found ${deals.length} deals`);

        // Search for products
        console.log('\nSearching products...');
        const searchTerms = ['chicken breast', 'milk', 'bread'];
        for (const term of searchTerms) {
            const products = await scraper.searchProducts(store.id, term);
            console.log(`\n${term} - Found ${products.length} products:`);
            products.slice(0, 3).forEach(p => {
                console.log(`- ${p.name}: ${p.price}`);
                if (p.offers.length) {
                    console.log('  Offers:', p.offers.map(o => o.description).join(', '));
                }
            });
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

if (!API_KEY) {
    console.error('Please set INSTACART_API_KEY environment variable');
    process.exit(1);
}

console.log('Starting Instacart API Test...\n');
testInstacart(); 
testInstacart(); 