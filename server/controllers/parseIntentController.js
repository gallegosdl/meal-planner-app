// controllers/parseIntentController.js
const { parseUserIntent } = require('../services/openaiService');

exports.parseIntentHandler = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid input text' });
    }

    const parsedIntent = await parseUserIntent(text);

    // Extra validation
    if (
      !parsedIntent ||
      typeof parsedIntent !== 'object' ||
      !parsedIntent.intent ||
      typeof parsedIntent.intent !== 'string'
    ) {
      console.error('❌ parseUserIntent returned invalid:', parsedIntent);
      return res.status(400).json({ error: 'Failed to understand your request. Please rephrase and try again.' });
    }

    console.log('✅ Sending parsedIntent:', JSON.stringify(parsedIntent, null, 2));
    res.json(parsedIntent);

  } catch (err) {
    console.error('❌ Error parsing user intent:', err);

    // If error was intentionally thrown from parseUserIntent
    if (err.message && err.message.includes("couldn't understand")) {
      return res.status(400).json({ error: err.message });
    }

    // For any other server error
    res.status(500).json({ error: 'Failed to parse intent' });
  }
};