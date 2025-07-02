const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.OAUTH_REDIRECT_URI
    );
  }

  async syncMealPlanToCalendar(accessToken, mealPlan) {
    try {
      // Set up OAuth2 client with the access token
      this.oauth2Client.setCredentials({ access_token: accessToken });

      // Create Calendar API client
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Create calendar events for each meal
      const events = [];
      for (const day of mealPlan.days) {
        const date = new Date();
        date.setDate(date.getDate() + day.day - 1);

        // Create events for each meal type
        for (const [mealType, meal] of Object.entries(day.meals)) {
          const mealTime = this.getMealTime(mealType, date);
          const endTime = new Date(mealTime);
          endTime.setHours(endTime.getHours() + 1);

          const event = {
            summary: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)}: ${meal.name}`,
            description: `
              Ingredients: ${meal.ingredients.map(ing => ing.name).join(', ')}
              
              Instructions: ${meal.instructions}
              
              Nutrition:
              - Calories: ${meal.nutrition?.calories || 0}
              - Protein: ${meal.nutrition?.protein_g || 0}g
              - Carbs: ${meal.nutrition?.carbs_g || 0}g
              - Fat: ${meal.nutrition?.fat_g || 0}g
            `.trim(),
            start: {
              dateTime: mealTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: endTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            colorId: this.getMealColorId(mealType),
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 30 }
              ]
            }
          };

          try {
            const response = await calendar.events.insert({
              calendarId: 'primary',
              resource: event
            });
            events.push(response.data);
          } catch (error) {
            console.error(`Failed to create event for ${mealType}:`, error);
          }
        }
      }

      return events;
    } catch (error) {
      console.error('Failed to sync meal plan to calendar:', error);
      throw error;
    }
  }

  getMealTime(mealType, date) {
    const mealTime = new Date(date);
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        mealTime.setHours(8, 0, 0, 0);
        break;
      case 'lunch':
        mealTime.setHours(12, 0, 0, 0);
        break;
      case 'dinner':
        mealTime.setHours(18, 0, 0, 0);
        break;
      default:
        mealTime.setHours(12, 0, 0, 0);
    }
    return mealTime;
  }

  getMealColorId(mealType) {
    // Google Calendar color IDs (1-11)
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        return '1'; // Blue
      case 'lunch':
        return '2'; // Green
      case 'dinner':
        return '3'; // Purple
      default:
        return '7'; // Gray
    }
  }
}

module.exports = GoogleCalendarService; 