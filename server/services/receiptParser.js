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
    let processedImagePath = null;
    try {
      processedImagePath = await this.preprocessImage(imagePath);
      
      const base64Image = fs.readFileSync(processedImagePath, 'base64');
      
      const prompt = `Analyze this receipt and return ONLY a JSON array of items.
DO NOT include any other text or explanations.
ONLY return an array in this exact format:
[
  {
    "name": "item name",
    "quantity": number,
    "price": number
  }
]
For example: [{"name":"Apples","quantity":2,"price":3.99}]

Remember: Return ONLY the JSON array, no other text.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a receipt parser that ONLY returns JSON arrays. Never include explanatory text."
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      console.log('Raw response:', content);

      // Clean the response
      const cleanedContent = content
        .replace(/```json\n?|\n?```/g, '')  // Remove code blocks
        .replace(/^[\s\n]*Here.*?\[/m, '[') // Remove any leading text
        .replace(/\][\s\n]*:.*/s, ']');     // Remove any trailing text

      console.log('Cleaned response:', cleanedContent);

      try {
        const items = JSON.parse(cleanedContent);
        return {
          items: items.map(item => ({
            ...item,
            category: this.categorizeItem(item.name)
          })),
          total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        };
      } catch (parseError) {
        console.error('Parse error:', parseError);
        console.error('Content that failed to parse:', cleanedContent);
        throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
      }

    } catch (error) {
      console.error('Receipt parsing error:', error);
      throw error;
    } finally {
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
