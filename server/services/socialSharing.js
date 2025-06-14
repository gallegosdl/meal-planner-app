const { TwitterApi } = require('twitter-api-v2');

class SocialSharing {
  constructor() {
    // Initialize with OAuth 1.0a credentials
    this.twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,          // API Key
      appSecret: process.env.TWITTER_API_SECRET,    // API Key Secret
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
  }

  async shareRecipe(recipe) {
    try {
      console.log('Sharing recipe:', recipe);
      const tweetText = this.formatRecipeTweet(recipe);
      console.log('Tweet text:', tweetText);
      
      // Get the read-write client
      const rwClient = this.twitterClient.readWrite;
      console.log('Twitter client initialized');
      
      // Using v2 tweet creation endpoint
      console.log('Attempting to tweet...');
      const response = await rwClient.v2.tweet({
        text: tweetText
      });
      console.log('Tweet posted successfully:', response);

      return { success: true, message: 'Recipe shared successfully' };
    } catch (error) {
      console.error('Twitter sharing error details:', {
        error: error.message,
        data: error.data,
        code: error.code,
        stack: error.stack
      });
      return { 
        success: false, 
        error: error.data?.detail || error.message || 'Failed to share recipe' 
      };
    }
  }

  formatRecipeTweet(recipe) {
    const tweet = `🍳 Just made ${recipe.name}! Ready in ${recipe.prep_time}
Difficulty: ${recipe.difficulty}
#MealPlanner #Cooking #${recipe.difficulty.replace(/\s+/g, '')}`;
    
    // Check tweet length
    console.log('Tweet length:', tweet.length);
    return tweet;
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