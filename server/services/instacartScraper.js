const axios = require('axios');

class InstacartScraper {
  constructor(apiKey) {
    this.baseUrl = 'https://api.instacart.com/v2/fulfillment';
    this.client = axios.create({
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Instacart-Client': 'retailer-connect',
        'X-Instacart-Client-Source': 'api'
      }
    });
  }

  async searchStores(zipCode = '89113') {
    try {
      const response = await this.client.get(`${this.baseUrl}/stores`, {
        params: {
          zip_code: zipCode,
          retailer_id: 'albertsons',
          fulfillment_type: 'delivery'
        }
      });
      return response.data.stores;
    } catch (error) {
      console.error('Store search error:', error.message);
      throw error;
    }
  }

  async getDeals(storeId) {
    try {
      const response = await this.client.get(`${this.baseUrl}/stores/${storeId}/offers`);
      return response.data.offers.map(offer => ({
        id: offer.id,
        type: offer.type,
        description: offer.description,
        savings: offer.discount_amount,
        expiresAt: offer.expiration_date,
        terms: offer.terms
      }));
    } catch (error) {
      console.error('Deals error:', error.message);
      throw error;
    }
  }

  async searchProducts(storeId, query) {
    try {
      const response = await this.client.get(`${this.baseUrl}/stores/${storeId}/products`, {
        params: {
          q: query,
          per_page: 40
        }
      });

      return response.data.products.map(item => ({
        name: item.name,
        price: item.price,
        image: item.image_url,
        details: item.description,
        offers: item.active_offers || []
      }));
    } catch (error) {
      console.error('Product search error:', error.message);
      throw error;
    }
  }
}

module.exports = InstacartScraper; 