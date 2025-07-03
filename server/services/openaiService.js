// services/openaiService.js
const OpenAI = require('openai');

// Create OpenAI client with provided API key
const createOpenAIClient = (apiKey) => {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }
  return new OpenAI({ apiKey });
};

exports.parseUserIntent = async (inputText, apiKey) => {
  const openai = createOpenAIClient(apiKey);
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `
      You are a robust NLU engine for a meal planning and activity logging assistant.
      
      You must *strictly* parse user requests into *one* of these JSON schemas based on the detected intent.
      
      ---
      
      1️⃣ Meal Plan Request
      
      {
        "intent": "generate_meal_plan",
        "entities": {
          "dietGoals": [string],
          "likes": [string],
          "dislikes": [string],
          "macros": {"protein": number, "carbs": number, "fat": number},
          "budget": number
        }
      }
      
      - dietGoals: phrases like "low-carb", "high-protein", "vegetarian".
      - likes: ingredients or cuisines to include.
      - dislikes: ingredients or cuisines to avoid.
      - macros: extract any mention of protein/carbs/fat percentages (e.g. "50% protein" -> protein: 50).
      - budget: extract dollar amounts (e.g. "$60" -> 60).
      - If any field is missing, make it an empty array, object, or null as appropriate.
      
      ---
      
      2️⃣ Fitbit Activity Log Request
      
      {
        "intent": "log_fitbit_activity",
        "entities": {
          "activityType": string,
          "startTime": string,
          "durationMinutes": number,
          "distanceMiles": number,
          "caloriesBurned": number
        }
      }
      
      - activityType: type of exercise (e.g. run, walk, cycle).
      - startTime: parse times like "6am" -> "6:00".
      - durationMinutes: extract durations like "30 minutes" -> 30.
      - distanceMiles: extract distances like "5 miles" -> 5.
      - caloriesBurned: extract calories like "400 calories" -> 400.
      - Use null for any field not mentioned.
      
      ---
      
      3️⃣ Strava Activity Log Request
      
      {
        "intent": "log_strava_activity",
        "entities": {
          "activityType": string,
          "startTime": string,
          "durationMinutes": number,
          "distanceMiles": number,
          "elevationGainFeet": number
        }
      }
      
      - activityType: type of exercise (e.g. bike ride, run, hike).
      - startTime: parse times like "6am" -> "6:00".
      - durationMinutes: extract durations like "30 minutes" -> 30.
      - distanceMiles: extract distances like "5 miles" -> 5.
      - elevationGainFeet: extract elevation like "500 feet" -> 500.
      - Use null for any field not mentioned.
      
      ---
      
      ⚠️ INTENT SELECTION RULES:
      
      - If the user mentions **Fitbit** (phrases like "in Fitbit", "to Fitbit", "for Fitbit", "on Fitbit"), choose log_fitbit_activity.
      - If the user mentions **Strava** (phrases like "in Strava", "to Strava", "for Strava", "on Strava"), choose log_strava_activity.
      - If the user does not explicitly mention Fitbit or Strava but describes any **workout, exercise, run, walk, bike ride, hike, weight training, or other physical activity**, always default to **log_fitbit_activity**.
      - If the user requests a meal plan, choose **generate_meal_plan** intent.
      
      ---
      
      ✅ IMPORTANT: Always use the appropriate function call with the matching schema. Do not reply in text. Always call one of the provided functions with structured JSON arguments matching the schema exactly.
      
      ---
      
      EXAMPLES:
      
      UUser: "I want a low-carb meal plan with 50% protein and $60 budget"

      Function Call:
      extract_meal_plan_intent({
        "intent": "generate_meal_plan",
        "entities": {
          "dietGoals": ["low-carb"],
          "likes": [],
          "dislikes": [],
          "macros": {
            "protein": 50,
            "carbs": null,
            "fat": null
          },
          "budget": 60
        }
      })
      
      ---
      
      User: "Log a 6am run for 5 miles over 30 minutes with 400 calories burned to Fitbit"
      
      Function Call:
      extract_log_fitbit_activity_intent({
        "intent": "log_fitbit_activity",
        "entities": {
          "activityType": "run",
          "startTime": "6:00",
          "durationMinutes": null,
          "distanceMiles": 5,
          "caloriesBurned": null
        }
      })
      
      ---
      
      User: "Log to Strava a 6am bike ride for 5 miles over 30 minutes with 500 feet elevation"
      
      Function Call:
      extract_log_strava_activity_intent({
        "intent": "log_fitbit_activity",
        "entities": {
          "activityType": "run",
          "startTime": "6:00",
          "durationMinutes": null,
          "distanceMiles": 5,
          "caloriesBurned": null
        }
      })
      
      ---
      
      User: "6am run for 5 miles"
      
      Function Call:
      extract_log_fitbit_activity_intent({
        "intent": "log_fitbit_activity",
        "entities": {
          "activityType": "run",
          "startTime": "6:00",
          "durationMinutes": null,
          "distanceMiles": 5,
          "caloriesBurned": null
        }
      })
      `
      },
      {
        role: "user",
        content: inputText
      }
    ],
    function_call: "auto",
    temperature: 0,
    functions: [
      {
        name: "extract_meal_plan_intent",
        description: "Extracts structured meal plan intent",
        parameters: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              description: "Always 'generate_meal_plan'"
            },
            entities: {
              type: "object",
              properties: {
                dietGoals: {
                  type: "array",
                  items: { type: "string" }
                },
                likes: {
                  type: "array",
                  items: { type: "string" }
                },
                dislikes: {
                  type: "array",
                  items: { type: "string" }
                },
                macros: {
                  type: "object",
                  properties: {
                    protein: { type: "number" },
                    carbs: { type: "number" },
                    fat: { type: "number" }
                  }
                },
                budget: {
                  type: "number"
                }
              }
            }
          }
        }
      },
      {
        name: "extract_log_fitbit_activity_intent",
        description: "Extracts structured Fitbit activity logging intent",
        parameters: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              description: "Always 'log_fitbit_activity'"
            },
            entities: {
              type: "object",
              properties: {
                activityType: { type: "string" },
                startTime: { type: "string" },
                durationMinutes: { type: "number" },
                distanceMiles: { type: "number" },
                caloriesBurned: { type: "number" }
              }
            }
          }
        }
      },
      {
        name: "extract_log_strava_activity_intent",
        description: "Extracts structured Strava activity logging intent",
        parameters: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              description: "Always 'log_strava_activity'"
            },
            entities: {
              type: "object",
              properties: {
                activityType: { type: "string" },
                startTime: { type: "string" },
                durationMinutes: { type: "number" },
                distanceMiles: { type: "number" },
                elevationGainFeet: { type: "number" }
              }
            }
          }
        }
      }
    ]
  });

  const toolCall = response.choices[0].message.function_call;
  console.log("RAW FUNCTION CALL:", toolCall);

  if (!toolCall) {
    console.error('OpenAI returned no function_call:', response.choices[0].message);
    throw new Error("Sorry, I couldn't understand your request.");
  }

  // Parse and fill defaults
  const parsed = JSON.parse(toolCall.arguments);

  if (!parsed.entities) parsed.entities = {};

  switch (parsed.intent) {
    case "generate_meal_plan":
      parsed.entities.dietGoals ??= [];
      parsed.entities.likes ??= [];
      parsed.entities.dislikes ??= [];
      parsed.entities.macros ??= {};
      parsed.entities.macros.protein ??= null;
      parsed.entities.macros.carbs ??= null;
      parsed.entities.macros.fat ??= null;
      parsed.entities.budget ??= null;
      break;

    case "log_fitbit_activity":
      parsed.entities.activityType ??= null;
      parsed.entities.startTime ??= null;
      parsed.entities.durationMinutes ??= null;
      parsed.entities.distanceMiles ??= null;
      parsed.entities.caloriesBurned ??= null;
      break;

    case "log_strava_activity":
      parsed.entities.activityType ??= null;
      parsed.entities.startTime ??= null;
      parsed.entities.durationMinutes ??= null;
      parsed.entities.distanceMiles ??= null;
      parsed.entities.elevationGainFeet ??= null;
      break;

    default:
      console.error('Unknown intent type:', parsed.intent);
      throw new Error(`Unknown intent type: ${parsed.intent}`);
  }

  return parsed;

};
