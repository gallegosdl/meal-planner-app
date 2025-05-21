const OpenAI = require('openai');
require('dotenv').config();

class MealPlanGenerator {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  cleanJsonString(str) {
    try {
      // First remove any markdown formatting
      let cleaned = str
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Try direct parse first
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.day && parsed.meals) {
          return JSON.stringify(parsed);
        }
      } catch (e) {
        console.log('First parse attempt failed, cleaning JSON...');
      }

      // More aggressive cleaning only if needed
      cleaned = cleaned
        .replace(/\*+/g, '')
        .replace(/\s+/g, ' ')
        // Ensure proper quotes around property names
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        // Ensure proper quotes around string values
        .replace(/:\s*([^"{}\[\],\s][^,}\]]*[^"{}\[\],\s]?)([,}\]])/g, ':"$1"$2')
        .trim();

      // Final parse attempt
      try {
        const parsed = JSON.parse(cleaned);
        if (!parsed.day || !parsed.meals) {
          throw new Error('Invalid meal plan structure');
        }
        return JSON.stringify(parsed);
      } catch (parseError) {
        console.error('Parse error after cleaning:', parseError);
        throw new Error('Failed to parse JSON after cleaning');
      }
    } catch (error) {
      console.error('JSON cleaning error:', error);
      throw new Error('Failed to clean JSON response');
    }
  }

  validateMeal(meal) {
    if (!meal || typeof meal !== 'object') {
      return {
        name: "Default meal",
        ingredients: [],
        instructions: "No instructions available"
      };
    }

    // Ensure ingredients are in the correct format
    const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.map(ing => ({
      name: ing.item || ing.name || "Unknown ingredient",
      amount: ing.amount || "Amount not specified",
      cost: ing.estimated_cost || null
    })) : [];

    return {
      name: meal.name || "Unnamed meal",
      ingredients: ingredients,
      instructions: meal.instructions || "No instructions available"
    };
  }

  async generateMealPlan(data) {
    try {
      const { ingredients, preferences } = data;
      
      if (!ingredients || !preferences || !preferences.cuisinePreferences) {
        throw new Error('Missing required data');
      }

      // Helper function to handle API calls with retries
      const makeOpenAIRequest = async (prompt, retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await this.openai.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: `You are a meal planning assistant. Generate a single day of meals in JSON format.
Return ONLY a JSON object with exactly this structure:
{
  "day": (number),
  "meals": {
    "breakfast": {
      "name": "string",
      "ingredients": [{"name": "string", "amount": "string"}],
      "instructions": "string"
    },
    "lunch": {
      "name": "string",
      "ingredients": [{"name": "string", "amount": "string"}],
      "instructions": "string"
    },
    "dinner": {
      "name": "string",
      "ingredients": [{"name": "string", "amount": "string"}],
      "instructions": "string"
    }
  }
}`
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              temperature: 0.7,
              max_tokens: 2000
            });
            return response;
          } catch (error) {
            if (error.status === 429) {  // Rate limit error
              console.log(`Rate limit hit, attempt ${i + 1} of ${retries}. Waiting ${delay}ms...`);
              if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;  // Exponential backoff
                continue;
              }
            }
            throw error;
          }
        }
        throw new Error('Failed after retry attempts');
      };

      // Format preferences with type checking
      const formatPreference = (pref) => {
        if (!pref) return 'None';
        if (Array.isArray(pref)) return pref.join(', ');
        if (typeof pref === 'string') return pref;
        return String(pref);
      };

      // Generate one day at a time with retries
      const days = [];
      for (let dayNum = 1; dayNum <= 2; dayNum++) {
        try {
          const dayPrompt = `Create day ${dayNum} of a 2-day meal plan using these ingredients:
${ingredients.map(i => `- ${i.name} (${i.quantity})`).join('\n')}

Cuisine preferences (percentage influence):
${Object.entries(preferences.cuisinePreferences)
  .filter(([_, value]) => value > 0)
  .map(([cuisine, value]) => `- ${cuisine}: ${value}%`)
  .join('\n')}

Dietary Preferences:
Preferred Foods: ${formatPreference(preferences.likes)}
Foods to Avoid: ${formatPreference(preferences.dislikes)}

Format the response as a single JSON object with this exact structure:
{
  "day": ${dayNum},
  "meals": {
    "breakfast": {
      "name": "Meal Name",
      "ingredients": [{"name": "ingredient", "amount": "amount"}],
      "instructions": "cooking instructions"
    },
    "lunch": {
      "name": "Meal Name",
      "ingredients": [{"name": "ingredient", "amount": "amount"}],
      "instructions": "cooking instructions"
    },
    "dinner": {
      "name": "Meal Name",
      "ingredients": [{"name": "ingredient", "amount": "amount"}],
      "instructions": "cooking instructions"
    }
  }
}`;

          const response = await makeOpenAIRequest(dayPrompt);
          const content = response.choices[0]?.message?.content;
          
          if (!content) {
            console.warn(`Empty response for day ${dayNum}, using default meal plan`);
            days.push({
              day: dayNum,
              meals: {
                breakfast: this.validateMeal(),
                lunch: this.validateMeal(),
                dinner: this.validateMeal()
              }
            });
            continue;
          }

          // Clean and parse the response
          const cleanedContent = this.cleanJsonString(content);
          console.log(`Day ${dayNum} cleaned content:`, cleanedContent); // Debug log

          try {
            const dayPlan = JSON.parse(cleanedContent);
            // Validate the entire day structure
            const validatedDayPlan = this.validateDayPlan(dayPlan, dayNum);
            days.push(validatedDayPlan);
          } catch (parseError) {
            console.error(`Parse error for day ${dayNum}:`, parseError);
            console.error('Content that failed to parse:', cleanedContent);
            days.push(this.validateDayPlan(null, dayNum));
          }
        } catch (error) {
          console.error(`Error generating day ${dayNum}:`, error);
          days.push({
            day: dayNum,
            meals: {
              breakfast: this.validateMeal(),
              lunch: this.validateMeal(),
              dinner: this.validateMeal()
            }
          });
        }
      }

      return { days };
    } catch (error) {
      if (error.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a few minutes.');
      }
      throw new Error(error.message || 'Failed to generate meal plan');
    }
  }

  // Helper method for default days
  getDefaultDay(dayNum) {
    return {
      day: dayNum,
      meals: {
        breakfast: this.validateMeal(),
        lunch: this.validateMeal(),
        dinner: this.validateMeal()
      }
    };
  }

  // Add meal structure validation
  validateDayPlan(dayPlan, dayNum) {
    const defaultMeal = {
      name: "Default meal",
      ingredients: [],
      instructions: "No instructions available"
    };

    if (!dayPlan || typeof dayPlan !== 'object') {
      return {
        day: dayNum,
        meals: {
          breakfast: defaultMeal,
          lunch: defaultMeal,
          dinner: defaultMeal
        }
      };
    }

    const meals = dayPlan.meals || {};
    
    return {
      day: dayNum,
      meals: {
        breakfast: this.validateMeal(meals.breakfast) || defaultMeal,
        lunch: this.validateMeal(meals.lunch) || defaultMeal,
        dinner: this.validateMeal(meals.dinner) || defaultMeal
      }
    };
  }
}

module.exports = MealPlanGenerator; 