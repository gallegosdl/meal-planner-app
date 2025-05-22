const OpenAI = require('openai');
const sharp = require('sharp');
const fs = require('fs');
require('dotenv').config();

class ReceiptParser {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }
    
    // Log key format validation
    console.log('API Key format check:', {
      length: apiKey.length,
      prefix: apiKey.startsWith('sk-'),
      isString: typeof apiKey === 'string'
    });

    this.openai = new OpenAI({
      apiKey: apiKey,
      timeout: 60000,        // Increase timeout to 60s
      maxRetries: 3,
      baseURL: 'https://api.openai.com/v1', // Explicitly set base URL
    });
  }

  async preprocessImage(imagePath) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('Image file not found');
      }

      const outputPath = imagePath.replace('.png', '_processed.png');
      await sharp(imagePath)
        .resize(2400, null, { fit: 'contain' })
        .sharpen()
        .normalize()
        .toFile(outputPath);
      return outputPath;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      throw new Error(`Failed to preprocess image: ${error.message}`);
    }
  }

  async parseReceipt(imagePath) {
    try {
      // Log API configuration
      console.log('OpenAI Configuration:', {
        hasClient: !!this.openai,
        model: "gpt-4.1",
        imageExists: fs.existsSync(imagePath),
        imageSize: fs.statSync(imagePath).size
      });

      const processedPath = await this.preprocessImage(imagePath);
      const imageBuffer = await fs.promises.readFile(processedPath);
      
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Extract items and quantities from this receipt." },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${imageBuffer.toString('base64')}`
                  }
                }
              ]
            }
          ],
          max_tokens: 500
        }).catch(error => {
          // Detailed error logging
          console.error('OpenAI API Error:', {
            status: error.status,
            message: error.message,
            type: error.type,
            code: error.code,
            details: error.response?.data
          });
          throw error;
        });

        await fs.promises.unlink(processedPath);
        return JSON.parse(response.choices[0].message.content);
      } catch (error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    } catch (error) {
      console.error('Full error details:', error);
      throw error;
    }
  }

  processOpenAIResponse(content) {
    try {
      // Remove markdown code block if present
      const jsonString = content.replace(/```json\n|\n```/g, '');
      console.log('Cleaned JSON string:', jsonString);
      
      const items = JSON.parse(jsonString);
      
      // Debug logging for each item's contribution to total
      let runningTotal = 0;
      items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        runningTotal += itemTotal;
        console.log(`Item: ${item.name}`);
        console.log(`  Price: ${item.price}`);
        console.log(`  Quantity: ${item.quantity}`);
        console.log(`  Item Total: ${itemTotal}`);
        console.log(`  Running Total: ${runningTotal}`);
      });

      return items.map(item => ({
        ...item,
        category: this.categorizeItem(item.name)
      }));
    } catch (error) {
      console.error('Error processing OpenAI response:', error);
      return [];
    }
  }

  categorizeItem(name) {
    const categories = {
      produce: [
        'apple', 'orange', 'banana', 'tomato', 'potato', 'onion',
        'pepper', 'lettuce', 'carrot', 'lemon', 'lime', 'jalapeno',
        'pear'
      ],
      dairy: ['milk', 'cheese', 'yogurt', 'cream', 'butter'],
      meat: ['chicken', 'beef', 'pork', 'fish', 'turkey'],
      bakery: ['bread', 'roll', 'bun', 'bagel', 'muffin'],
      beverages: ['water', 'soda', 'juice', 'coffee', 'tea', 'enhance'],
      pantry: ['pasta', 'rice', 'cereal', 'soup', 'sauce'],
      paper_goods: ['paper', 'towel', 'flora']
    };

    const lowercaseName = name.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowercaseName.includes(keyword))) {
        return category;
      }
    }
    return 'other';
  }

  cleanupItemName(name) {
    return name
      .replace(/[^\w\s\-\.]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = ReceiptParser;
