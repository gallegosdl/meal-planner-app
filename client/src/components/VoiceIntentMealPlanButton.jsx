import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

// Normalizes common ASR mis-hearings
const normalizeTranscript = (text) => {
  if (!text) return text;

  let normalized = text;

  const replacements = [
    { pattern: /\bstraw\b/gi, replacement: 'Strava' },
    { pattern: /\bstraw bag\b/gi, replacement: 'Strava' },
    { pattern: /\bfit bit\b/gi, replacement: 'Fitbit' },
    { pattern: /\bstriver\b/gi, replacement: 'Strava' },
    // Add more substitutions if you find other ASR errors!
  ];

  replacements.forEach(({ pattern, replacement }) => {
    normalized = normalized.replace(pattern, replacement);
  });

  return normalized;
};

const VoiceIntentMealPlanButton = ({ onMealPlanGenerated, isLoading, setIsLoading }) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Your browser does not support Speech Recognition.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setTranscript('');
      toast('Listening for intent...', {
        icon: '🎤',
      });
    };

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      console.log('🎤 Voice transcript:', result);
      setTranscript(result);
      handleTranscript(result);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      toast.error('Speech recognition failed. Please try again.');
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const handleTranscript = async (spokenText) => {
    console.log('🗣️ Original transcript:', spokenText);
  
    const normalizedText = normalizeTranscript(spokenText);
    console.log('✅ Normalized transcript:', normalizedText);
  
    toast(`Heard: "${normalizedText}"`, {
      icon: '🎤',
      duration: 4000,
    });
  
    try {
      setIsLoading(true);
      toast.loading('Parsing your voice command...');
  
      // 1. Call backend to parse natural language into structured intent
      const parseResponse = await api.post('/api/parse-intent', { text: normalizedText });
      const parsedIntent = parseResponse.data;
  
      console.log('✅ ParsedIntent:', JSON.stringify(parsedIntent, null, 2));
  
      // 2. Validation FIRST
      if (!parsedIntent || typeof parsedIntent !== 'object') {
        console.error('ERROR: parseIntent response was not JSON object:', parseResponse.data);
        toast.error('Sorry, I could not understand that request (bad server response).');
        return;
      }
  
      if (!parsedIntent.intent) {
        console.error('ERROR: Missing intent field:', parsedIntent);
        toast.error('Sorry, I could not understand that request. Please try again.');
        return;
      }
  
      // 3. Route based on intent
      if (parsedIntent.intent === 'generate_meal_plan') {
        const generateResponse = await api.post('/api/generate-meal-plan', {
          preferences: parsedIntent.entities
        });
        onMealPlanGenerated(generateResponse.data);
        toast.success('Meal Plan generated from voice input!');
      } 
      else if (parsedIntent.intent === 'log_fitbit_activity') {
        await api.post('/api/fitbit/log-fitbit-activity', { activity: parsedIntent.entities });
        toast.success('Fitbit Activity Logged from voice input!');
      } 
      else if (parsedIntent.intent === 'log_strava_activity') {
        await api.post('/api/log-strava-activity', { activity: parsedIntent.entities });
        toast.success('Strava Activity Logged from voice input!');
      } 
      else {
        // Unknown intent value
        console.error('ERROR: Unrecognized intent:', parsedIntent.intent);
        toast.error(`Unrecognized intent: ${parsedIntent.intent}`);
      }
  
    } catch (error) {
      console.error('Error processing voice intent:', error);
  
      const serverMessage = error?.response?.data?.error;
      if (serverMessage) {
        toast.error(serverMessage);
      } else {
        toast.error('Failed to process voice command. Please try again.');
      }
  
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={startListening}
      className={`w-full px-6 py-3 text-lg font-semibold rounded-xl shadow-[0_0_12px_2px_rgba(59,130,246,0.3)] hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.35)] transition-all backdrop-blur
        ${listening ? 'bg-blue-800 text-white' : 'bg-[#111827]/50 text-blue-300 border-2 border-blue-400/40 hover:bg-[#1e293b]/60 hover:border-blue-400/60'}
        disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3`}
      disabled={isLoading || listening}
    >
      {listening ? 'Listening...' : '🎙️ Drive Your Meal Plan with Intent'}
    </button>
  );
};

export default VoiceIntentMealPlanButton;
