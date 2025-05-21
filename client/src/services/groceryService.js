import axios from 'axios';
import cheerio from 'cheerio';

class GroceryService {
  constructor() {
    this.baseUrl = 'https://www.albertsons.com';
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
  }

  async searchProducts(query) {
    try {
      // We'll need a backend proxy to avoid CORS issues
      const response = await this.api.get(`/shop/search-results.html?q=${encodeURIComponent(query)}`);
      const $ = cheerio.load(response.data);
      
      const products = [];
      
      // This selector will need to be updated based on Albertsons' actual HTML structure
      $('.product-item').each((i, element) => {
        products.push({
          name: $(element).find('.product-title').text().trim(),
          price: $(element).find('.product-price').text().trim(),
          image: $(element).find('.product-image').attr('src'),
          link: $(element).find('a').attr('href')
        });
      });

      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getProductDetails(productUrl) {
    try {
      const response = await this.api.get(productUrl);
      const $ = cheerio.load(response.data);
      
      // Extract detailed product information
      return {
        name: $('.product-name').text().trim(),
        price: $('.product-price').text().trim(),
        nutrition: {
          calories: $('.nutrition-calories').text().trim(),
          protein: $('.nutrition-protein').text().trim(),
          // ... other nutritional info
        }
      };
    } catch (error) {
      console.error('Error fetching product details:', error);
      throw error;
    }
  }
}

export const groceryService = new GroceryService(); 