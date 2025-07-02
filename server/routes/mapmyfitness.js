const express = require('express');
const router = express.Router();
const { extractRouteIntent } = require('../services/voiceIntentExtractor'); // use new NLP extractor
const { getSuggestedRoute } = require('../services/mapMyFitnessService');

console.log('✅ mapmyfitness.js route loaded');

// POST /api/mapmyfitness/voice
router.post('/voice', async (req, res) => {
  const { transcript } = req.body;
  console.log('🔊 Transcript received:', transcript); // CONFIRMED already showing
  const apiKey = req.headers['x-session-token']; // Optional: pass to OpenAI if session-scoped
  console.log('🔊 Transcript received:', transcript);
  try {
    const intent = await extractRouteIntent(transcript, apiKey);
    console.log('🧠 Extracted intent:', intent); // <== THIS SHOULD SHOW
    if (!intent || !intent.location || !intent.distance_km) {
      return res.status(400).json({ error: 'Unable to determine route intent' });
    }

    const distanceMeters = intent.distance_km * 1000;
    const result = await getSuggestedRoute(intent.location, distanceMeters, intent.activity);
    console.log('🗺️ Suggested route result:', result);
    
    res.json({ route: result, intent });
  } catch (err) {
    console.error('MapMyFitness NLP/Route error:', err.message);
    res.status(500).json({ error: 'Failed to fetch suggested route' });
  }
});

module.exports = router;
