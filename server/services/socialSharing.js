const { TwitterApi } = require('twitter-api-v2');
const { UserProfile, Recipe } = require('../models');

class SocialSharing {
  constructor() {
    this.twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
  }

  async shareRecipe(userId, recipeId) {
    try {
      const recipe = await Recipe.findByPk(recipeId);
      const user = await UserProfile.findByPk(userId);
      
      const tweetText = this.formatRecipeTweet(recipe, user);
      
      // Create tweet with recipe image if available
      if (recipe.imageUrl) {
        const mediaId = await this.twitterClient.v1.uploadMedia(recipe.imageUrl);
        await this.twitterClient.v2.tweet({
          text: tweetText,
          media: { media_ids: [mediaId] }
        });
      } else {
        await this.twitterClient.v2.tweet(tweetText);
      }

      return { success: true, message: 'Recipe shared successfully' };
    } catch (error) {
      console.error('Twitter sharing error:', error);
      return { success: false, error: error.message };
    }
  }

  formatRecipeTweet(recipe, user) {
    const savings = this.calculateSavings(recipe);
    const hashtags = this.generateHashtags(recipe);
    
    return `🍳 Just made ${recipe.name} using my meal planner!
${savings ? `💰 Saved ${savings} on ingredients` : ''}
🔗 Get the recipe: ${process.env.APP_URL}/recipes/${recipe.id}
${hashtags}`;
  }

  calculateSavings(recipe) {
    // Calculate savings based on price comparison data
    return null; // Implement actual calculation
  }

  generateHashtags(recipe) {
    const tags = ['MealPlanner', 'Cooking'];
    
    // Add diet-specific tags
    if (recipe.isVegetarian) tags.push('Vegetarian');
    if (recipe.isVegan) tags.push('Vegan');
    if (recipe.isGlutenFree) tags.push('GlutenFree');
    
    // Add meal type tags
    if (recipe.type) tags.push(recipe.type);
    
    return tags.map(tag => `#${tag}`).join(' ');
  }

  async shareSavings(userId, savingsData) {
    const user = await UserProfile.findByPk(userId);
    const tweetText = this.formatSavingsTweet(savingsData, user);
    
    await this.twitterClient.v2.tweet(tweetText);
  }

  formatSavingsTweet(savingsData, user) {
    return `💰 Weekly Grocery Update:
Saved $${savingsData.totalSavings} this week!
🏪 Best deals from ${savingsData.bestStore}
🎯 ${Math.round(savingsData.budgetPerformance)}% under budget
#MealPlanning #Savings #SmartShopping`;
  }
}

module.exports = new SocialSharing(); 