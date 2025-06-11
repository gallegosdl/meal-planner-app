const axios = require('axios');
const OpenAI = require('openai');

class NutritionService {
  constructor() {
    this.openai = new OpenAI(process.env.OPENAI_API_KEY);
    this.MFP_API_KEY = process.env.MYFITNESSPAL_API_KEY;
  }

  enhancePromptWithNutrition(basePrompt, nutritionGoals) {
    return `${basePrompt}\n\nPlease ensure the meal plan meets these nutritional requirements:
    - Daily Calories: ${nutritionGoals.calories || 'balanced'}
    - Protein: ${nutritionGoals.protein || 'adequate'}
    - Carbs: ${nutritionGoals.carbs || 'balanced'}
    - Fat: ${nutritionGoals.fat || 'healthy sources'}
    
    For each recipe, include estimated nutritional information per serving.`;
  }

  async analyzeRecipeNutrition(recipe) {
    try {
      // First try MyFitnessPal API
      const mfpResponse = await this.getMFPNutrition(recipe);
      if (mfpResponse) return mfpResponse;

      // Fallback to AI estimation
      return await this.estimateNutritionWithAI(recipe);
    } catch (error) {
      console.error('Nutrition analysis error:', error);
      return null;
    }
  }

  async getMFPNutrition(recipe) {
    try {
      const response = await axios.get('https://api.myfitnesspal.com/v2/foods/search', {
        headers: {
          'Authorization': `Bearer ${this.MFP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          q: recipe.name,
          fields: 'nutrition'
        }
      });

      return response.data;
    } catch (error) {
      console.error('MyFitnessPal API error:', error);
      return null;
    }
  }

  async estimateNutritionWithAI(recipe) {
    const prompt = `Analyze this recipe and provide estimated nutritional information:
    Recipe: ${recipe.name}
    Ingredients: ${recipe.ingredients.map(i => `${i.amount} ${i.name}`).join(', ')}
    
    Please provide:
    1. Calories per serving
    2. Protein (g)
    3. Carbohydrates (g)
    4. Fat (g)
    5. Fiber (g)
    6. Key vitamins and minerals`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    // Parse AI response into structured data
    return this.parseNutritionFromAI(completion.choices[0].message.content);
  }

  parseNutritionFromAI(aiResponse) {
    // Implement parsing logic here
    // Return structured nutrition data
    return {
      estimated: true,
      nutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        vitamins: []
      }
    };
  }

  async syncWithMyFitnessPal(userId, mealPlan) {
    // Implement MFP sync logic here
    // This would require user's MFP credentials and proper OAuth setup
  }
}

module.exports = new NutritionService(); 