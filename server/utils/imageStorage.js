const fs = require('fs').promises;
const path = require('path');

class ImageStorage {
  constructor() {
    this.uploadDir = path.join(__dirname, '..', 'uploads', 'recipes');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Saves a base64 image to the filesystem
   * @param {string} base64Data - Base64 encoded image data
   * @param {string} fileName - Name to save the file as
   * @returns {Promise<string>} - URL path to the saved image
   */
  async saveBase64Image(base64Data, fileName) {
    try {
      console.log('Saving image:', {
        hasData: !!base64Data,
        dataLength: base64Data?.length,
        fileName
      });

      if (!base64Data) {
        throw new Error('No base64 data provided');
      }

      // Remove the data URL prefix if present
      const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
      
      console.log('Base64 image data:', {
        originalLength: base64Data.length,
        processedLength: base64Image.length
      });

      // Create buffer from base64
      const imageBuffer = Buffer.from(base64Image, 'base64');
      
      console.log('Image buffer:', {
        length: imageBuffer.length,
        isBuffer: Buffer.isBuffer(imageBuffer)
      });

      // Generate file path
      const filePath = path.join(this.uploadDir, fileName);

      // Ensure the directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Write the file
      await fs.writeFile(filePath, imageBuffer);
      console.log('Image saved successfully:', filePath);

      // Return the relative URL path
      return `/uploads/recipes/${fileName}`;
    } catch (error) {
      console.error('Error saving image:', error);
      throw error;
    }
  }

  /**
   * Generates a unique filename for a recipe image
   * @param {number} recipeId - ID of the recipe
   * @returns {string} - Generated filename
   */
  generateFileName(recipeId) {
    return `recipe-${recipeId}-${Date.now()}.jpg`;
  }

  /**
   * Process and save generated images for recipes
   * @param {Array} recipes - Array of recipes, some may have generated_image property
   * @returns {Promise<Array>} - Array of recipes with updated image_url
   */
  async processGeneratedImages(recipes) {
    for (const recipe of recipes) {
      if (recipe.generated_image) {
        try {
          const fileName = this.generateFileName(recipe.id);
          recipe.image_url = await this.saveBase64Image(recipe.generated_image, fileName);
          delete recipe.generated_image; // Clean up temporary data
        } catch (error) {
          console.error(`Failed to save image for recipe ${recipe.id}:`, error);
        }
      }
    }
    return recipes;
  }
}

module.exports = new ImageStorage(); 