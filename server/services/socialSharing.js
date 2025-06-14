const { TwitterApi } = require('twitter-api-v2');

class SocialSharing {
  constructor() {
    // Initialize with OAuth 2.0 credentials
    this.twitterClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
  }

  async shareRecipe(recipe) {
    try {
      const tweetText = this.formatRecipeTweet(recipe);
      
      // Using v2 tweet creation endpoint
      const response = await this.twitterClient.v2.tweet({
        text: tweetText
      });

      return { success: true, message: 'Recipe shared successfully' };
    } catch (error) {
      console.error('Twitter sharing error:', error);
      return { 
        success: false, 
        error: error.data?.detail || error.message || 'Failed to share recipe' 
      };
    }
  }

  formatRecipeTweet(recipe) {
    return `🍳 Just made ${recipe.name}! Ready in ${recipe.prep_time}
Difficulty: ${recipe.difficulty}
#MealPlanner #Cooking #${recipe.difficulty.replace(/\s+/g, '')}`;
  }

  async shareSavings(userId, savingsData) {
    const user = await User.findByPk(userId);
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