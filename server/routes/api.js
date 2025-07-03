const express = require('express');
const multer = require('multer');
const ReceiptParser = require('../services/receiptParser');
const MealPlanGenerator = require('../services/mealPlanGenerator');
const fs = require('fs');
const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      cb(null, Date.now() + '.png')
    }
  })
});

router.post('/parse-receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get API key from session
    const token = req.headers['x-session-token'];
    const session = req.app.get('sessions').get(token);
    
    if (!session?.apiKey) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    console.log('Processing file:', req.file.path);
    
    const parser = new ReceiptParser(session.apiKey);
    const result = await parser.parseReceipt(req.file.path);
    
    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.json(result);
  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      stack: error.stack,
      details: error.response?.data
    });
    
    res.status(500).json({ 
      error: 'Failed to parse receipt',
      details: error.message
    });
    
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// Generate meal plan route with session-based auth
router.post('/generate-meal-plan', async (req, res) => {
  // Get API key from session
  const token = req.headers['x-session-token'];
  const session = req.app.get('sessions').get(token);
  
  if (!session?.apiKey) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  try {
    const generator = new MealPlanGenerator(session.apiKey);
    // Add userId to the request body
    // Get userId from either session or request body
    const userId = session.userId || req.body.userId;
    if (!userId) {
      console.warn('No userId found in session or request');
    }
    
    const requestWithUserId = {
      ...req.body,
      userId // Use userId from either source
    };
    console.log('Generating meal plan with user ID:', userId);
    
    // ORIGINAL: Uncomment line below to use original method
    // const mealPlan = await generator.generateMealPlan(requestWithUserId);
    
    // NEW: Comment out lines below to test original method
    const useStreaming = req.body.useStreaming || false;
    const totalDays = req.body.totalDays || 2;
    
    let mealPlan;
    if (useStreaming) {
      console.log('🚀 Using NEW streaming meal plan generation');
      mealPlan = await generator.generateMealPlanStreamingTest(requestWithUserId, totalDays);
    } else {
      console.log('📋 Using ORIGINAL meal plan generation');
      mealPlan = await generator.generateMealPlan(requestWithUserId);
    }
    
    res.json(mealPlan);
  } catch (error) {
    console.error('Meal plan generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate meal plan',
      details: error.message
    });
  }
});

// NEW: Server-Sent Events streaming endpoint for real-time meal plan generation
router.post('/generate-meal-plan-stream', async (req, res) => {
  // Get API key from session
  const token = req.headers['x-session-token'];
  console.log('🔑 Streaming request token:', token ? 'EXISTS' : 'MISSING');
  console.log('🗂️ Available sessions:', req.app.get('sessions').size);
  
  const session = req.app.get('sessions').get(token);
  console.log('📋 Found session:', session ? 'YES' : 'NO');
  
  if (!session?.apiKey) {
    console.log('❌ Session validation failed - returning 401');
    return res.status(401).json({ error: 'Invalid session', details: { hasToken: !!token, hasSession: !!session, hasApiKey: !!session?.apiKey } });
  }

  try {
    const generator = new MealPlanGenerator(session.apiKey);
    const userId = session.userId || req.body.userId;
    
    const requestWithUserId = {
      ...req.body,
      userId
    };
    
    const totalDays = req.body.totalDays || 7;
    console.log(`🚀 Starting SSE streaming meal plan for ${totalDays} days with user ID:`, userId);
    
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial status
    res.write(`data: ${JSON.stringify({ 
      type: 'start', 
      totalDays, 
      message: `Starting generation of ${totalDays} days...` 
    })}\n\n`);

    try {
      let completedDays = 0;
      const allDays = [];
      
      // Use the streaming generator
      for await (const dayPlan of generator.generateMealPlanStreaming(requestWithUserId, totalDays)) {
        completedDays++;
        allDays.push(dayPlan);
        
        console.log(`📥 Collected day ${dayPlan.day} in allDays. Total collected: ${allDays.length}`);
        
        // Send each day as it's generated
        res.write(`data: ${JSON.stringify({ 
          type: 'day', 
          day: dayPlan.day,
          dayPlan,
          progress: {
            completed: completedDays,
            total: totalDays,
            percentage: Math.round((completedDays / totalDays) * 100)
          }
        })}\n\n`);
        
        console.log(`📤 Streamed day ${dayPlan.day} to client (${completedDays}/${totalDays})`);
      }
      
      console.log(`🎯 Streaming complete! Collected ${allDays.length} days:`, allDays.map(d => `Day ${d.day}`).join(', '));
      
      // Store complete meal plan in database
      if (userId && allDays.length > 0) {
        try {
          console.log(`💾 Storing complete meal plan with ${allDays.length} days:`, allDays.map(d => `Day ${d.day}`).join(', '));
          const completeMealPlan = { days: allDays };
          const mealPlanId = await generator.storeMealPlanInDatabase(completeMealPlan, userId, `Streaming Meal Plan - ${allDays.length} days`);
          console.log(`✅ Stored complete streaming meal plan with ID: ${mealPlanId}`);
          
          // Clean up old meal plans after storing the new one
          await generator.cleanupOldMealPlans(userId);
          console.log(`🧹 Cleaned up old meal plans after storing new complete plan`);
        } catch (dbError) {
          console.error(`⚠️ Failed to store complete streaming meal plan:`, dbError.message);
        }
      } else {
        console.log(`⚠️ Not storing meal plan - userId: ${userId}, allDays.length: ${allDays.length}`);
      }
      
      // Send completion message
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        totalDays: allDays.length,
        requestedDays: totalDays,
        success: true,
        message: `Successfully generated ${allDays.length} days!`,
        mealPlan: { 
          days: allDays, 
          generatedWithStreaming: true,
          totalDays: allDays.length,
          requestedDays: totalDays,
          partial: allDays.length < totalDays
        }
      })}\n\n`);
      
    } catch (streamError) {
      console.error('Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: streamError.message,
        message: 'An error occurred during generation'
      })}\n\n`);
    }
    
    res.end();
    
  } catch (error) {
    console.error('SSE meal plan generation error:', error);
    res.status(500).json({ 
      error: 'Failed to start streaming meal plan generation',
      details: error.message
    });
  }
});

// NEW: Test route for streaming meal plan generation
router.post('/generate-meal-plan-streaming', async (req, res) => {
  // Get API key from session
  const token = req.headers['x-session-token'];
  const session = req.app.get('sessions').get(token);
  
  if (!session?.apiKey) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  try {
    const generator = new MealPlanGenerator(session.apiKey);
    // Add userId to the request body
    // Get userId from either session or request body
    const userId = session.userId || req.body.userId;
    if (!userId) {
      console.warn('No userId found in session or request');
    }
    
    const requestWithUserId = {
      ...req.body,
      userId // Use userId from either source
    };
    
    const totalDays = req.body.totalDays || 7;
    console.log(`🚀 Generating streaming meal plan for ${totalDays} days with user ID:`, userId);
    
    const mealPlan = await generator.generateMealPlanStreamingTest(requestWithUserId, totalDays);
    res.json(mealPlan);
  } catch (error) {
    console.error('Streaming meal plan generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate streaming meal plan',
      details: error.message
    });
  }
});

module.exports = router; 