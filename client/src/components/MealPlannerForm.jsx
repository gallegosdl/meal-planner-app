import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PieController
} from 'chart.js';
import api, { authenticate, clearSession } from '../services/api';
import RecipeList from './RecipeList';
import { toast } from 'react-hot-toast';
import PantryModal from './PantryModal';
import CuisinePreferences from './CuisinePreferences';
import MacronutrientSplit from './MacronutrientSplit';
import HouseholdBox from './HouseholdBox';
import DietaryGoals from './DietaryGoals';
import DailyCalories from './DailyCalories';
import MealsPerWeek from './MealsPerWeek';
import MealPreferences from './MealPreferences';
import PreferredFoods from './PreferredFoods';
import AvoidedFoods from './AvoidedFoods';
import UploadReceipt from './UploadReceipt';
import MealPlanResults from './MealPlanResults';
import BuildMealPlanWithPantryButton from './BuildMealPlanWithPantryButton';
import FitbitDisplay from './FitbitDisplay';
import StravaDisplay from './StravaDisplay';
import ApiKeyInput from './ApiKeyInput';
import Header from './Header';
import UserMealPlanContainer from './UserMealPlanContainer';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PieController
);

const MealPlannerForm = ({ user, onMealPlanGenerated, handleLogout }) => {
  // Meal plan generation inputs
  const [mealPlanInputs, setMealPlanInputs] = useState({
    dietGoals: [],
    likes: '',
    dislikes: '',
    macros: {
      protein: 30,
      carbs: 40,
      fat: 30
    },
    mealsPerWeek: {
      breakfast: 5,
      lunch: 5,
      dinner: 5
    },
    budget: 75
  });

  // UI/Visualization specific state
  const [visualData, setVisualData] = useState({
    householdSize: 1,
    householdMembers: [{ id: 1, name: 'Member 1', photo: null }],
    store: 'Smiths',
    targetCalories: 2000,
    actualCalories: 1800,
    budget: 75
  });

  // Keep existing formData for backward compatibility during transition
  const [formData, setFormData] = useState({
    householdSize: 1,
    householdMembers: [{ id: 1, name: 'Member 1', photo: null }],
    mealsPerWeek: { breakfast: 5, lunch: 5, dinner: 5 },
    dietGoals: [],
    likes: '',
    dislikes: '',
    budget: 75,
    store: 'Smiths',
    targetCalories: 2000,
    actualCalories: 1800,
    macros: {
      protein: 30,
      carbs: 40,
      fat: 30
    }
  });

  const [receiptItems, setReceiptItems] = useState([]);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [detectedItems, setDetectedItems] = useState([]);
  const [mealPlan, setMealPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [cuisinePreferences, setCuisinePreferences] = useState({
    Cajun: 0,
    Creole: 0,
    Mexican: 0,
    Italian: 0,
    Greek: 0,
    Chinese: 0,
    Japanese: 0,
    Thai: 0,
    MiddleEastern: 0
  });

  const [activeTab, setActiveTab] = useState(1);
  const [viewMode, setViewMode] = useState('tabs'); // 'tabs', 'tiles', 'calendar', or 'recipes'

  const [isPantryModalOpen, setIsPantryModalOpen] = useState(false);

  const [showRecipeList, setShowRecipeList] = useState(false);

  const [dailyCalorieTotals, setDailyCalorieTotals] = useState([]);

  const [activityCalories, setActivityCalories] = useState({
    strava: 0,
    fitbit: 0
  });

  // NEW: Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState({
    completed: 0,
    total: 0,
    percentage: 0,
    currentDay: null,
    generatedDays: []
  });

  const mealPlanContainerRef = useRef();

  const dietOptions = {
    'Diet Types': [
      'High-Protein',
      'Low-Carb',
      'Low-Calorie',
      'Keto',
      'Paleo',
      'Mediterranean'
    ],
    'Health Goals': [
      'Heart-Healthy',
      'Weight Loss',
      'Muscle Gain',
      'Blood Sugar Control'
    ],
    'Restrictions': [
      'Vegetarian',
      'Vegan',
      'Gluten-Free',
      'Dairy-Free',
      'Pescatarian',
      'Nut-Free'
    ]
  };

  // New handlers for mealPlanInputs
  const handleMealPlanChange = (field, value) => {
    setMealPlanInputs(prev => ({ ...prev, [field]: value }));
    // Keep formData in sync during transition
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMacroChange = (macro, value) => {
    const newValue = parseInt(value);
    const oldValue = mealPlanInputs.macros[macro];
    const difference = newValue - oldValue;
    const otherMacros = Object.keys(mealPlanInputs.macros).filter(m => m !== macro);
    const totalOtherMacros = otherMacros.reduce((sum, m) => sum + mealPlanInputs.macros[m], 0);
    const newMacros = { ...mealPlanInputs.macros };
    newMacros[macro] = newValue;

    if (totalOtherMacros === 0 && difference < 0) {
      const firstOther = otherMacros[0];
      newMacros[firstOther] = Math.abs(difference);
    } else {
      otherMacros.forEach(m => {
        const proportion = totalOtherMacros === 0 ? 0 : mealPlanInputs.macros[m] / totalOtherMacros;
        newMacros[m] = Math.max(0, Math.round(mealPlanInputs.macros[m] - (difference * proportion)));
      });
    }

    const total = Object.values(newMacros).reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      const lastMacro = otherMacros[otherMacros.length - 1];
      newMacros[lastMacro] += (100 - total);
    }

    setMealPlanInputs(prev => ({
      ...prev,
      macros: newMacros
    }));
    // Keep formData in sync during transition
    setFormData(prev => ({
      ...prev,
      macros: newMacros
    }));
  };

  const handleMealsChange = (type, value) => {
    const newMealsPerWeek = {
      ...mealPlanInputs.mealsPerWeek,
      [type]: value
    };
    setMealPlanInputs(prev => ({
      ...prev,
      mealsPerWeek: newMealsPerWeek
    }));
    // Keep formData in sync during transition
    setFormData(prev => ({
      ...prev,
      mealsPerWeek: newMealsPerWeek
    }));
  };

  // New handler for visual data changes that also updates formData
  const handleVisualChange = (field, value) => {
    setVisualData(prev => {
      const newData = { ...prev, [field]: value };
      // Keep formData in sync during transition
      setFormData(prevForm => ({ ...prevForm, [field]: value }));
      return newData;
    });
  };

  // Update existing handlers to use new state
  const handleChange = (field, value) => {
    if (field in mealPlanInputs) {
      handleMealPlanChange(field, value);
    } else if (field in visualData) {
      handleVisualChange(field, value);
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const toggleDietGoal = (goal) => {
    setMealPlanInputs(prev => {
      const newGoals = prev.dietGoals.includes(goal)
        ? prev.dietGoals.filter(g => g !== goal)
        : [...prev.dietGoals, goal];
      return { ...prev, dietGoals: newGoals };
    });
    // Keep formData in sync during transition
    setFormData(prev => {
      const newGoals = prev.dietGoals.includes(goal)
        ? prev.dietGoals.filter(g => g !== goal)
        : [...prev.dietGoals, goal];
      return { ...prev, dietGoals: newGoals };
    });
  };

  const handleCuisineChange = (cuisine, value) => {
    const newValue = Math.max(0, Math.min(100, parseInt(value) || 0));
    
    // Calculate total of other cuisines
    const otherTotal = Object.entries(cuisinePreferences)
      .filter(([key]) => key !== cuisine)
      .reduce((sum, [_, val]) => sum + val, 0);
      
    // Check if new total would exceed 100%
    if (otherTotal + newValue > 100) {
      return; // Don't update if it would exceed 100%
    }

    setCuisinePreferences(prev => ({
      ...prev,
      [cuisine]: newValue
    }));
  };

  const cuisineChartData = {
    labels: Object.keys(cuisinePreferences).map(cuisine => 
      cuisine.replace(/([A-Z])/g, ' $1').trim()
    ),
    datasets: [{
      data: Object.values(cuisinePreferences),
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF',
        '#FF9F40',
        '#FF6384',
        '#36A2EB',
        '#FFCE56'
      ],
      borderWidth: 1
    }]
  };

  const macroData = {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [{
      data: [mealPlanInputs.macros.protein, mealPlanInputs.macros.carbs, mealPlanInputs.macros.fat],
      backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'],
      borderWidth: 0
    }]
  };

  const calorieData = {
    labels: ['Target', 'Current'],
    datasets: [{
      data: [visualData.targetCalories, visualData.actualCalories],
      backgroundColor: ['#3b82f6', '#f59e0b'],
      borderRadius: 8,
      barThickness: 20
    }]
  };

  const handlePhotoUpload = (memberId, file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          householdMembers: prev.householdMembers.map(member => 
            member.id === memberId 
              ? { ...member, photo: e.target.result }
              : member
          )
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const updateHouseholdSize = (newSize) => {
    const currentSize = formData.householdMembers.length;
    if (newSize > currentSize) {
      const newMembers = [...Array(newSize - currentSize)].map((_, i) => ({
        id: currentSize + i + 1,
        name: `Member ${currentSize + i + 1}`,
        photo: null
      }));
      setFormData(prev => ({
        ...prev,
        householdSize: newSize,
        householdMembers: [...prev.householdMembers, ...newMembers]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        householdSize: newSize,
        householdMembers: prev.householdMembers.slice(0, newSize)
      }));
    }
  };

  const handleReceiptUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const sessionToken = sessionStorage.getItem('session_token');
    if (!sessionToken) {
      alert('Please enter your OpenAI API key first');
      return;
    }

    setIsParsingReceipt(true);
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const response = await api.post('/api/parse-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });
      
      console.log('Receipt parsing response:', response.data);
      
      if (response.data.items) {
        setReceiptItems(response.data.items);
        setDetectedItems(response.data.items.map(item => ({
          name: item.name,
          quantity: item.quantity
        })));
      }
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        headers: error.response?.headers,
        status: error.response?.status
      });
      alert('Failed to parse receipt. Please try again.');
    } finally {
      setIsParsingReceipt(false);
    }
  };

  const handleGenerateMealPlan = async () => {
    // NEW: Use streaming if enabled
    if (mealPlanInputs.useStreaming) {
      return handleStreamingMealPlan();
    }
    
    try {
      setIsLoading(true);
      if (!user?.id) {
        console.warn('No user ID available for meal plan generation');
      }
      
      const payload = {
        preferences: {
          cuisinePreferences: Object.fromEntries(
            Object.entries(cuisinePreferences).filter(([_, value]) => value > 0)
          ),
          ...mealPlanInputs,
          likes: mealPlanInputs.likes.split(',').map(item => item.trim()).filter(Boolean),
          dislikes: mealPlanInputs.dislikes.split(',').map(item => item.trim()).filter(Boolean)
        },
        ingredients: detectedItems || [],
        userId: user?.id,
        // NEW: Add streaming test parameters
        useStreaming: mealPlanInputs.useStreaming || false,
        totalDays: mealPlanInputs.totalDays || 2
      };

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      // Show appropriate toast based on generation method
      if (mealPlanInputs.useStreaming) {
        toast(`🚀 Generating ${mealPlanInputs.totalDays || 2} days with NEW streaming method...`, {
          duration: 3000,
          icon: '🧪',
          style: {
            background: '#1a1f2b',
            color: '#fb923c',
            border: '1px solid rgba(251,146,60,0.3)',
          },
        });
      } else {
        toast('📋 Generating meal plan with ORIGINAL method...', {
          duration: 3000,
          icon: '🍽️',
          style: {
            background: '#1a1f2b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        });
      }

      const response = await api.post('/api/generate-meal-plan', payload);
      console.log('Server response:', response);
      setMealPlan(response.data);
      
      // Refresh both views in the container
      if (mealPlanContainerRef.current?.refresh) {
        mealPlanContainerRef.current.refresh();
      }
      
      // Show success message based on generation method
      if (response.data.generatedWithStreaming) {
        const isPartial = response.data.partial;
        const totalDays = response.data.totalDays;
        const requestedDays = response.data.requestedDays;
        
        if (isPartial) {
          toast.success(`🚀 Streaming meal plan partially complete! Generated ${totalDays} out of ${requestedDays} days. Scroll down to view!`, {
            duration: 5000,
            icon: '⚠️',
            style: {
              background: '#1a1f2b',
              color: '#fbbf24',
              border: '1px solid rgba(251,191,36,0.3)',
            },
          });
        } else {
          toast.success(`🚀 Streaming meal plan complete! Generated all ${totalDays} days. Scroll down to view!`, {
            duration: 4000,
            icon: '🧪',
            style: {
              background: '#1a1f2b',
              color: '#fb923c',
              border: '1px solid rgba(251,146,60,0.3)',
            },
          });
        }
      } else {
        toast.success('📋 Meal Plan Available! Scroll down to view your Personalized Plan.', {
          duration: 4000,
          icon: '📋',
          style: {
            background: '#1a1f2b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        });
      }
    } catch (error) {
      console.error('Error details:', error.response?.data);
      setError(error.response?.data?.error || 'Failed to generate meal plan');
      
      toast.error('Failed to generate meal plan. Please try again.', {
        duration: 4000,
        style: {
          background: '#1a1f2b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handle SSE streaming meal plan generation
  const handleStreamingMealPlan = async () => {
    if (!user) {
      toast.error('Please authenticate first');
      return;
    }

    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    setStreamingProgress({
      completed: 0,
      total: 0,
      percentage: 0,
      currentDay: null,
      generatedDays: []
    });

    try {
      const payload = {
        preferences: {
          cuisinePreferences: Object.fromEntries(
            Object.entries(cuisinePreferences).filter(([_, value]) => value > 0)
          ),
          ...mealPlanInputs,
          likes: mealPlanInputs.likes.split(',').map(item => item.trim()).filter(Boolean),
          dislikes: mealPlanInputs.dislikes.split(',').map(item => item.trim()).filter(Boolean)
        },
        ingredients: detectedItems || [],
        userId: user?.id,
        totalDays: mealPlanInputs.totalDays || 5
      };

      console.log('Starting SSE streaming for payload:', JSON.stringify(payload, null, 2));

      const sessionToken = sessionStorage.getItem('session_token');
      console.log('🔑 Session token for streaming:', sessionToken ? 'EXISTS' : 'MISSING');
      
      if (!sessionToken) {
        throw new Error('No session token found');
      }

      // Use fetch with streaming (no EventSource needed for POST)
      const baseURL = process.env.NODE_ENV === 'production'
        ? 'https://meal-planner-app-3m20.onrender.com'
        : 'http://localhost:3001';
      
      const response = await fetch(`${baseURL}/api/generate-meal-plan-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(payload),
      });

      console.log('🌐 Streaming response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      toast(`🚀 Starting streaming generation of ${payload.totalDays} days...`, {
        duration: 3000,
        icon: '🔄',
        style: {
          background: '#1a1f2b',
          color: '#fb923c',
          border: '1px solid rgba(251,146,60,0.3)',
        },
      });

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('SSE received:', data);
              
              if (data.type === 'start') {
                setStreamingProgress(prev => ({
                  ...prev,
                  total: data.totalDays,
                  percentage: 0
                }));
                
              } else if (data.type === 'day') {
                console.log(`📥 Received day ${data.day}:`, data.dayPlan);
                
                // Update progress
                setStreamingProgress(prev => ({
                  ...prev,
                  completed: data.progress.completed,
                  percentage: data.progress.percentage,
                  currentDay: data.day,
                  generatedDays: [...prev.generatedDays, data.dayPlan]
                }));
                
                // Update meal plan with current days
                setMealPlan(prev => ({
                  ...prev,
                  days: prev?.days ? [...prev.days, data.dayPlan] : [data.dayPlan],
                  generatedWithStreaming: true,
                  totalDays: data.progress.completed,
                  partial: data.progress.completed < data.progress.total
                }));
                
                // Show progress toast
                toast(`✅ Day ${data.day} complete! (${data.progress.completed}/${data.progress.total})`, {
                  duration: 2000,
                  icon: '🎯',
                  style: {
                    background: '#1a1f2b',
                    color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.3)',
                  },
                });
                
              } else if (data.type === 'complete') {
                console.log('🎉 Streaming complete:', data);
                
                // Final update
                setMealPlan(data.mealPlan);
                
                // Refresh both views in the container
                if (mealPlanContainerRef.current?.refresh) {
                  mealPlanContainerRef.current.refresh();
                }
                
                // Show success message
                if (data.mealPlan.partial) {
                  toast.success(`🚀 Streaming complete! Generated ${data.mealPlan.totalDays} out of ${data.mealPlan.requestedDays} days. Scroll down to view!`, {
                    duration: 5000,
                    icon: '⚠️',
                    style: {
                      background: '#1a1f2b',
                      color: '#fbbf24',
                      border: '1px solid rgba(251,191,36,0.3)',
                    },
                  });
                } else {
                  toast.success(`🎉 Streaming complete! Generated all ${data.mealPlan.totalDays} days. Scroll down to view!`, {
                    duration: 4000,
                    icon: '🚀',
                    style: {
                      background: '#1a1f2b',
                      color: '#fb923c',
                      border: '1px solid rgba(251,146,60,0.3)',
                    },
                  });
                }
                
              } else if (data.type === 'error') {
                console.error('SSE error:', data);
                throw new Error(data.message || 'Streaming error occurred');
              }
              
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Streaming error:', error);
      setError(error.message || 'Failed to generate streaming meal plan');
      
      toast.error('Failed to generate streaming meal plan. Please try again.', {
        duration: 4000,
        style: {
          background: '#1a1f2b',
          color: '#ef4444',
          border: '1px solid rgba(239,68,68,0.3)',
        },
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // handleLogout is now passed as a prop from App.js

  // Update preferences when user data is available
  useEffect(() => {
    if (user) {
      // Update mealPlanInputs with user data
      setMealPlanInputs(prev => ({
        ...prev,
        email: user.email,
        userId: user.id
      }));

      // Update visualData with user data
      setVisualData(prev => ({
        ...prev,
        householdMembers: [
          { id: 1, name: user.name, photo: user.avatar_url || null },
          ...prev.householdMembers.slice(1)
        ]
      }));

      // Keep formData in sync during transition
      setFormData(prev => ({
        ...prev,
        email: user.email,
        userId: user.id,
        householdMembers: [
          { id: 1, name: user.name, photo: user.avatar_url || null },
          ...prev.householdMembers.slice(1)
        ]
      }));
    }
  }, [user]);

  // Update member name and photo when user data is available
  useEffect(() => {
    if (user?.name) {
      setVisualData(prev => ({
        ...prev,
        householdMembers: [
          { 
            id: 1, 
            name: user.name, 
            photo: user.avatar_url || null
          },
          ...prev.householdMembers.slice(1)
        ]
      }));

      // Keep formData in sync during transition
      setFormData(prev => ({
        ...prev,
        householdMembers: [
          { 
            id: 1, 
            name: user.name, 
            photo: user.avatar_url || null
          },
          ...prev.householdMembers.slice(1)
        ]
      }));
    }
  }, [user?.name, user?.avatar_url]);

  const handleDailyTotalsCalculated = React.useCallback((totals) => {
    // Only update if the totals have actually changed
    if (JSON.stringify(dailyCalorieTotals) !== JSON.stringify(totals)) {
      setDailyCalorieTotals(totals);
    }
  }, [dailyCalorieTotals]);

  const handleStravaCalories = React.useCallback((calories) => {
    setActivityCalories(prev => ({ ...prev, strava: calories }));
  }, []);

  const handleFitbitCalories = React.useCallback((calories) => {
    setActivityCalories(prev => ({ ...prev, fitbit: calories }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f2b] to-[#2d3748] text-white p-3 sm:p-6">
      <div className="max-w-[1400px] mx-auto">
        <Header user={user} handleLogout={handleLogout} />

        {/* First grid section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {/* Left column (3): Household, Budget */}
          <div className="col-span-1 lg:col-span-3 row-span-2 flex flex-col gap-3 sm:gap-6">
            <div className="flex-1">
              <HouseholdBox 
                householdData={visualData}
                handlePhotoUpload={handlePhotoUpload}
                updateHouseholdSize={updateHouseholdSize}
                handleChange={handleVisualChange}
                setIsPantryModalOpen={setIsPantryModalOpen}
                onMealPlanGenerated={setMealPlan}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                user={user}
              />
            </div>
            <div>
              <BuildMealPlanWithPantryButton
                onMealPlanGenerated={setMealPlan}
                cuisinePreferences={cuisinePreferences}
                formData={formData}
                detectedItems={detectedItems}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                setIsPantryModalOpen={setIsPantryModalOpen}
              />
            </div>
          </div>

          {/* UserMealPlanContainer spanning 9 columns */}
          <div className="col-span-1 lg:col-span-9 row-span-2 flex flex-col gap-3 sm:gap-6">
            <div className="flex-1 h-full">
              <UserMealPlanContainer 
                ref={mealPlanContainerRef}
                userId={user?.id} 
              />
            </div>
          </div>
        </div>

        {/* First row: DietaryGoals, DailyCalories in 4-8 grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <div className="col-span-1 lg:col-span-4">
            <DietaryGoals dietOptions={dietOptions} formData={mealPlanInputs} toggleDietGoal={toggleDietGoal} />
          </div>
          <div className="col-span-1 lg:col-span-8">
            <DailyCalories 
              formData={{ targetCalories: visualData.targetCalories }}
              handleChange={handleVisualChange}
              mealPlan={mealPlan ? {
                days: mealPlan.days || [],
                dailyCalorieTotals: dailyCalorieTotals
              } : null}
              isFormMode={false}
              stravaActivities={[{ calories: activityCalories.strava, start_date: new Date() }]}
              fitbitActivities={[{ calories: activityCalories.fitbit, startTime: new Date() }]}
            />
          </div>
        </div>

        {/* Dietary Goals & Fitbit/Strava side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <div className="col-span-1">
            <FitbitDisplay onCaloriesUpdate={handleFitbitCalories} />
          </div>
          <div className="col-span-1">
            <StravaDisplay onCaloriesUpdate={handleStravaCalories} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <div className="col-span-1">
            <MealPreferences formData={mealPlanInputs} handleChange={handleChange} />
          </div>
          <div className="col-span-1">
            <PreferredFoods formData={mealPlanInputs} />
          </div>
          <div className="col-span-1">
            <AvoidedFoods formData={mealPlanInputs} />
          </div>
        </div>

        {/* Upload Receipt */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <div className="col-span-1">
            <UploadReceipt 
              handleReceiptUpload={handleReceiptUpload} 
              isParsingReceipt={isParsingReceipt} 
              receiptItems={receiptItems} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <ApiKeyInput />
        </div>

        {/* NEW: Test Controls for Streaming */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <div className="col-span-1">
            <div className="bg-[#1a1f2b]/50 border border-yellow-400/30 rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(250,204,21,0.1)] backdrop-blur">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-yellow-400 font-semibold text-lg">Testing NEW Streaming Capability</span>
                <span className="text-xs text-gray-400 bg-yellow-500/10 px-2 py-1 rounded">BETA</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="useStreaming"
                    checked={mealPlanInputs.useStreaming || false}
                    onChange={(e) => handleMealPlanChange('useStreaming', e.target.checked)}
                    className="w-5 h-5 text-yellow-400 bg-gray-800 border-gray-600 rounded focus:ring-yellow-400 focus:ring-2"
                  />
                  <label htmlFor="useStreaming" className="text-yellow-300 font-medium">
                    Enable Streaming Generation
                  </label>
                </div>
                
                <div className="flex items-center gap-3">
                  <label htmlFor="totalDays" className="text-yellow-300 font-medium">
                    Days:
                  </label>
                  <input
                    type="number"
                    id="totalDays"
                    min="1"
                    max="14"
                    value={mealPlanInputs.totalDays || 2}
                    onChange={(e) => handleMealPlanChange('totalDays', parseInt(e.target.value))}
                    className="w-20 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
              
              <div className="mt-3 text-xs text-gray-400">
                {mealPlanInputs.useStreaming ? 
                  `Will generate ${mealPlanInputs.totalDays || 2} days using NEW streaming method` : 
                  'Will use ORIGINAL generation method (2 days)'
                }
              </div>
            </div>
          </div>
        </div>

        {/* NEW: Streaming Progress Indicator */}
        {isStreaming && (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
            <div className="col-span-1">
              <div className="bg-[#1a1f2b]/50 border border-green-400/30 rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(16,185,129,0.1)] backdrop-blur">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-green-400 font-semibold text-lg">Streaming Progress</span>
                  <span className="text-xs text-gray-400 bg-green-500/10 px-2 py-1 rounded">LIVE</span>
                </div>
                
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-400 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${streamingProgress.percentage}%` }}
                    ></div>
                  </div>
                  
                  {/* Progress Text */}
                  <div className="flex justify-between text-sm">
                    <span className="text-green-300">
                      {streamingProgress.currentDay ? `Generating Day ${streamingProgress.currentDay}...` : 'Starting generation...'}
                    </span>
                    <span className="text-gray-400">
                      {streamingProgress.completed} / {streamingProgress.total} days ({streamingProgress.percentage}%)
                    </span>
                  </div>
                  
                  {/* Generated Days Preview */}
                  {streamingProgress.generatedDays.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-400 mb-2">Generated Days:</div>
                      <div className="flex flex-wrap gap-2">
                        {streamingProgress.generatedDays.map((day, index) => (
                          <span key={index} className="inline-block bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                            Day {day.day}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <div className="col-span-1">
            <button
              onClick={handleGenerateMealPlan}
              className="w-full group px-4 sm:px-8 py-3 sm:py-4 bg-[#111827]/50 text-blue-400 font-semibold border-2 border-blue-400/50 rounded-xl shadow-[0_0_12px_2px_rgba(59,130,246,0.3)] hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.35)] hover:bg-[#1e293b]/60 hover:border-blue-400/60 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-4 backdrop-blur relative overflow-hidden text-sm sm:text-lg"
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Your Meal Plan'}
            </button>
          </div>
          <div className="col-span-1">
            <button
              onClick={() => setShowRecipeList((prev) => !prev)}
              className="w-full group px-4 sm:px-8 py-3 sm:py-4 bg-[#111827]/50 text-emerald-400 font-semibold border-2 border-emerald-400/50 rounded-xl shadow-[0_0_12px_2px_rgba(16,185,129,0.3)] hover:shadow-[0_0_16px_4px_rgba(16,185,129,0.35)] hover:bg-[#1e293b]/60 hover:border-emerald-400/60 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-4 backdrop-blur relative overflow-hidden text-sm sm:text-lg"
            >
              {showRecipeList ? 'Hide Recipe List' : 'View Recipe List'}
            </button>
          </div>
        </div>
        {showRecipeList && (
          <div className="mb-6 sm:mb-8">
            <RecipeList />
          </div>
        )}

        {mealPlan && (
          <div className="mb-6 sm:mb-8">
            {/* Generation method badges */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {mealPlan.generatedWithStreaming && (
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${
                  mealPlan.partial 
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
                    : 'bg-green-500/20 text-green-400 border-green-500/30'
                }`}>
                  {mealPlan.partial ? '⚠️' : '✅'} Generated with NEW streaming method ({mealPlan.totalDays} days{mealPlan.partial ? ` of ${mealPlan.requestedDays} requested` : ''})
                </span>
              )}
              {mealPlan.generatedWithPantry && (
                <span className="inline-block bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium border border-green-500/30">
                  🍽️ Generated with {mealPlan.pantryItemCount} Pantry Items
                </span>
              )}
              {!mealPlan.generatedWithStreaming && (
                <span className="inline-block bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium border border-blue-500/30">
                  📋 Generated with ORIGINAL method
                </span>
              )}
              {mealPlan.error && (
                <span className="inline-block bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium border border-red-500/30">
                  ⚠️ {mealPlan.error}
                </span>
              )}
            </div>
            <MealPlanResults 
              mealPlan={mealPlan}
              viewMode={viewMode}
              setViewMode={setViewMode}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onDailyTotalsCalculated={handleDailyTotalsCalculated}
            />
          </div>
        )}

        {/* Add PantryModal */}
        {isPantryModalOpen && (
          <PantryModal 
            isOpen={isPantryModalOpen} 
            onClose={() => setIsPantryModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default MealPlannerForm;