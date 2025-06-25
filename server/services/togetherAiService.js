const { Together } = require('together-ai');

class TogetherAiService {
  constructor() {
    const options = {};
    if (process.env.HELICONE_API_KEY) {
      options.baseURL = "https://together.helicone.ai/v1";
      options.defaultHeaders = {
        "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
        "Helicone-Property-RECIPE": "true",
      };
    }
    this.together = new Together(process.env.TOGETHER_API_KEY, options);
  }

  /**
   * Generates an image for a recipe using Together.ai
   * @param {Object} recipe - The recipe object containing name, description, etc.
   * @returns {Promise<string>} - Base64 encoded image data
   */
  async generateRecipeImage(recipe) {
    try {
      console.log('Generating image for recipe:', recipe.name);
      
      // Create a detailed prompt for the recipe
      const prompt = this.buildRecipePrompt(recipe);
      
      const response = await this.together.images.create({
        prompt,
        model: "black-forest-labs/FLUX.1-schnell",
        width: 1024,
        height: 768,
        steps: 5,
        response_format: "base64"
      });

      console.log('Image generation response:', {
        hasData: !!response.data,
        dataLength: response.data?.length,
        firstItemLength: response.data?.[0]?.b64_json?.length
      });

      if (!response.data?.[0]?.b64_json) {
        throw new Error('No image data received from Together.ai');
      }

      // Format the base64 data with data URL prefix
      return `data:image/jpeg;base64,${response.data[0].b64_json}`;
    } catch (error) {
      console.error('Error generating recipe image:', error);
      throw error;
    }
  }

  /**
   * Builds a detailed prompt for recipe image generation
   * @param {Object} recipe - The recipe object
   * @returns {string} - The generated prompt
   */
  buildRecipePrompt(recipe) {
    const basePrompt = `A professional food photography shot of ${recipe.name}, styled for a high-end cookbook or food magazine. The dish should look appetizing and well-plated.`;
    
    // Add details about the dish if available
    const details = [];
    if (recipe.ingredients?.length > 0) {
      const mainIngredients = recipe.ingredients
        .slice(0, 3)
        .map(ing => ing.name)
        .join(', ');
      details.push(`featuring ${mainIngredients}`);
    }

    // Add styling details
    details.push('shot from above');
    details.push('soft natural lighting');
    details.push('shallow depth of field');
    details.push('on a rustic wooden or marble surface');
    details.push('garnished with fresh herbs');
    details.push('vibrant colors');
    details.push('4k quality');
    details.push('highly detailed');
    details.push('photorealistic');

    return `${basePrompt} ${details.join(', ')}.`;
  }

  /**
   * Process the most recent recipes for image generation
   * @param {Array} recipes - Array of recipes from database
   * @param {number} limit - Number of recent recipes to process
   * @returns {Promise<Array>} - Array of recipes with image generation attempts
   */
  async processRecentRecipes(recipes, limit = 3) {
    // Only process the most recent 'limit' recipes that don't have images
    const recipesToProcess = recipes
      .filter(recipe => !recipe.image_url)
      .slice(0, limit);

    console.log(`Processing ${recipesToProcess.length} recent recipes for image generation`);

    for (const recipe of recipesToProcess) {
      try {
        const imageData = await this.generateRecipeImage(recipe);
        recipe.generated_image = imageData; // Store temporarily for processing
      } catch (error) {
        console.error(`Failed to generate image for recipe ${recipe.id}:`, error);
      }
    }

    return recipes; // Return all recipes, some may have generated_image property
  }
}

module.exports = TogetherAiService; 