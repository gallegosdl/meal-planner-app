const OpenAI = require('openai');
const { jsonrepair } = require('jsonrepair');
const SpiceProfileGenerator = require('./spiceProfileGenerator');

class OpenAiMealPlanner {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateMealPlan(groceryList, preferences) {
    const prompt = this.buildPrompt(groceryList, preferences);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: `You are a Michelin-starred executive chef known for bold flavors and innovative techniques. 
          Your expertise includes:
          - Complex flavor layering and umami development
          - Modern gastronomy and molecular techniques
          - Global spice mastery and fusion cuisine
          - Fine dining techniques adapted for home kitchens
          - Signature sauce development
          - Textural contrast creation
          - Professional plating design

          For example, instead of basic "scrambled eggs", you create dishes like:
          "Soft-Scrambled Eggs with Miso Butter, Crispy Shallots, Togarashi, and Chive Oil"
          featuring:
          - Eggs slowly scrambled with dashi and cream
          - Umami-rich miso compound butter
          - House-made chili oil
          - Crispy fried shallots
          - Fresh micro herbs
          - Togarashi spice blend
          - Maldon salt finish

          Or transform "chicken and rice" into:
          "Five-Spice Glazed Chicken with Ginger-Scallion Oil, Crispy Garlic, and Coconut Rice"
          featuring:
          - Chinese five-spice and honey glaze
          - House-made ginger-scallion oil
          - Crispy garlic chips
          - Coconut jasmine rice
          - Pickled chilies
          - Fresh herb salad

          Every dish should have:
          - Multiple texture components
          - House-made sauces or condiments
          - Aromatic flavor bases
          - Proper seasoning techniques
          - Professional garnishes
          - Temperature contrasts
          - Plating instructions

          You MUST respond with ONLY valid JSON - no additional text or explanations.`
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.8,
        max_tokens: 2500
      });

      // Print raw response for debugging
      const rawResponse = response.choices[0].message.content;
      console.log('Raw OpenAI response:', rawResponse);

      return this.parseResponse(rawResponse);
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  parseResponse(content) {
    try {
      // First try direct parse
      try {
        return JSON.parse(content);
      } catch (e) {
        // If direct parse fails, try to repair the JSON
        console.log('Direct JSON parse failed, attempting repair...');
        const repairedJson = jsonrepair(content);
        return JSON.parse(repairedJson);
      }
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      console.error('Raw content:', content);
      throw error;
    }
  }

  buildPrompt(groceryList, preferences) {
    const {
      householdSize,
      mealsPerWeek,
      dietGoals,
      likes,
      dislikes,
      budget,
      targetCalories,
      macros
    } = preferences;

    const spiceGen = new SpiceProfileGenerator();
    const asianProfile = spiceGen.generateSpiceProfile('asian');
    const medProfile = spiceGen.generateSpiceProfile('mediterranean');

    return `
You MUST respond with ONLY valid JSON - no additional text or explanations.
As an innovative chef specializing in global flavors and spice combinations, create a detailed meal plan:

HOUSEHOLD INFO:
- Size: ${householdSize} people
- Target calories per person: ${targetCalories} kcal/day
- Macro split: Protein ${macros.protein}%, Carbs ${macros.carbs}%, Fat ${macros.fat}%
- Weekly meals needed: ${JSON.stringify(mealsPerWeek)}
- Budget: $${budget}

DIETARY PREFERENCES:
- Goals: ${dietGoals.join(', ')}
- Liked foods: ${likes}
- Disliked foods: ${dislikes}

AVAILABLE INGREDIENTS ON SALE:
${JSON.stringify(groceryList.available_ingredients, null, 2)}

AVAILABLE SPICE PROFILES AND SIGNATURE SAUCES:
${JSON.stringify({ asian: asianProfile, mediterranean: medProfile }, null, 2)}

FLAVOR PROFILE REQUIREMENTS:
1. Each recipe must include a complete seasoning profile:
   - Base spices and herbs (exact measurements)
   - Aromatic ingredients (garlic, ginger, shallots, etc.)
   - Finishing seasonings and garnishes
   - Salt and acid balance components
   - Heat elements (chilies, peppercorns, etc.)
   - Umami boosters (miso, soy sauce, fish sauce, etc.)

2. Global Seasoning Combinations like:
   - Mediterranean: za'atar, sumac, harissa, preserved lemon
   - Asian: five spice, gochugaru, togarashi, curry blends
   - Latin: adobo, sofrito, mole, chimichurri
   - Middle Eastern: baharat, dukkah, ras el hanout
   - Indian: garam masala, tandoori masala, chaat masala

3. Layered Flavor Building:
   - Aromatic base preparations (sofrito, mirepoix, holy trinity)
   - Infused oils and compound butters
   - Spice blooming techniques
   - Marinades and brines
   - Pan sauce development
   - Fresh herb finishing
   - Textural garnishes

4. Each recipe should specify:
   - When to add each seasoning (beginning, middle, end)
   - Proper spice blooming techniques
   - Fresh vs dried herb usage
   - Salt timing and layering
   - Acid balance adjustments
   - Heat level modifications
   - Garnish preparation

The response MUST be valid JSON with this structure:
{
  "weekly_plan": {
    "meals": [
      {
        "day": "Monday",
        "meals": [
          {
            "type": "breakfast",
            "recipe": "Recipe name",
            "prep_time": "15 minutes",
            "cook_time": "20 minutes",
            "ingredients": [
              {
                "name": "Ingredient name",
                "amount": "precise measurement",
                "prep_notes": "how to prepare this ingredient"
              }
            ],
            "seasoning_profile": {
              "base_spices": [
                {
                  "name": "Spice name",
                  "amount": "exact measurement",
                  "timing": "when to add",
                  "technique": "how to use"
                }
              ],
              "aromatics": [],
              "marinades_sauces": [],
              "finishing_seasonings": [],
              "garnishes": []
            },
            "instructions": [
              "Detailed step 1 with timing and technique",
              "Detailed step 2 with temperature and method"
            ],
            "chef_tips": [
              "Spice balancing advice",
              "Heat level adjustments",
              "Seasoning substitutions"
            ],
            "nutrition": {
              "calories": 0,
              "protein": 0,
              "carbs": 0,
              "fat": 0
            },
            "cost": 0,
            "serving_size": "Amount per person",
            "storage": "Storage instructions",
            "reheating": "Reheating instructions"
          }
        ]
      }
    ],
    "shopping_list": {
      "proteins": [],
      "produce": [],
      "dairy": [],
      "pantry": [],
      "spices_seasonings": []
    },
    "total_cost": 0,
    "nutrition_summary": {},
    "meal_prep_strategy": {
      "spice_blends_to_prepare": [],
      "marinades_to_prepare": [],
      "prep_day_tasks": [],
      "storage_tips": [],
      "reheating_instructions": []
    }
  }
}

Remember: Respond with ONLY the JSON - no other text.`;
  }
}

module.exports = OpenAiMealPlanner; 