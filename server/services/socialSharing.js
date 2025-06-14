const { TwitterApi } = require('twitter-api-v2');

class SocialSharing {
  constructor() {
    this.twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
  }

  async shareRecipe(recipe) {
    try {
      const tweetText = this.formatRecipeTweet(recipe);
      await this.twitterClient.v2.tweet(tweetText);
      return { success: true, message: 'Recipe shared successfully' };
    } catch (error) {
      console.error('Twitter sharing error:', error);
      return { success: false, error: error.message };
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