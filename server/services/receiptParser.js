const OpenAI = require('openai');
const sharp = require('sharp');
const fs = require('fs');
require('dotenv').config();

class ReceiptParser {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
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
    let processedImagePath = null;
    try {
      processedImagePath = await this.preprocessImage(imagePath);
      
      const base64Image = fs.readFileSync(processedImagePath, 'base64');
      
      const prompt = `Analyze this grocery receipt and extract all items.
Return only a JSON array where each item has:
- name: cleaned up item name
- quantity: numeric quantity (only include if explicitly shown on receipt)
- price: numeric price without currency symbol (this should be the TOTAL price for this line item)

Important: 
- If quantity is not explicitly shown, assume quantity of 1
- Price should be the final price for that line item (if 2 items at $1 each, price should be $2)
- Do not multiply price by quantity in your response

Example: [{"name": "Jalapeno Peppers", "quantity": 2, "price": 0.47}]`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1
      });

      if (!response.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI');
      }

      console.log('OpenAI raw response:', response.choices[0].message.content);

      const items = this.processOpenAIResponse(response.choices[0].message.content);
      
      return {
        items,
        total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      };
    } catch (error) {
      console.error('Receipt parsing error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    } finally {
      // Clean up processed image
      if (processedImagePath && fs.existsSync(processedImagePath)) {
        fs.unlinkSync(processedImagePath);
      }
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
