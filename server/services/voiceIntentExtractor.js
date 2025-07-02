require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extracts route intent from a voice transcript.
 * Returns structured data: activity, location, distance_km, return_format
 */
async function extractRouteIntent(transcript, apiKey = null) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `
You are a helpful assistant that extracts structured data from spoken user requests for fitness routes.
You will return a JSON object with the following fields:

- activity: (string) run, walk, hike, or bike
- location: (string) city or coordinates if available
- distance_km: (number) in kilometers, rounded to 0.5 km. If distance not mentioned, default to 5.
- return_format: "gpx" | "kml" (optional, based on input)

Respond only with a JSON object. No explanations.
`
        },
        {
          role: 'user',
          content: `User said: "${transcript}"`
        }
      ],
      temperature: 0.2
    });

    const content = response.choices[0].message.content.trim();
    return JSON.parse(content);
  } catch (err) {
    console.error('NLP Extraction Error:', err.message);
    return null;
  }
}

module.exports = {
  extractRouteIntent
};
