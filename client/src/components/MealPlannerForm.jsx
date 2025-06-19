import React, { useState, useEffect } from 'react';
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
import { Doughnut, Bar, Pie } from 'react-chartjs-2';
import api, { authenticate, generateMealPlan, clearSession } from '../services/api';
import DraggableMealPlan from './DraggableMealPlan';
import CalendarMealPlan from './CalendarMealPlan';
import { GoogleOAuthProvider } from '@react-oauth/google';
import SendToInstacartButton from './SendToInstacartButton';
import RecipeList from './RecipeList';
import { toast } from 'react-hot-toast';
import StoreComparison from './StoreComparison';
import { Cog6ToothIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
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
import FitbitLogin from './FitbitLogin';
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

const MealPlannerForm = ({ user, onMealPlanGenerated }) => {
  const [preferences, setPreferences] = useState({
    preferences: {
      dietGoals: [], // From diet type checkboxes
      likes: [], // From user input
      dislikes: [], // From user input
      macros: {
        protein: 0,
        carbs: 0,
        fat: 0
      },
      budget: 75, // From budget slider
      cuisinePreferences: {}, // From cuisine preference sliders
      mealsPerWeek: {
        breakfast: 0,
        lunch: 0,
        dinner: 0
      }
    },
    ingredients: [] // From receipt parsing or manual input
  });

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
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [cuisinePreferences, setCuisinePreferences] = useState({
    cajun: 0,
    creole: 0,
    mexican: 0,
    italian: 0,
    greek: 0,
    chinese: 0,
    japanese: 0,
    thai: 0,
    middleEastern: 0
  });

  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');

  const [activeTab, setActiveTab] = useState(1);
  const [viewMode, setViewMode] = useState('tabs'); // 'tabs', 'tiles', 'calendar', or 'recipes'

  const [isPantryModalOpen, setIsPantryModalOpen] = useState(false);

  const [showRecipeList, setShowRecipeList] = useState(false);

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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMealsChange = (type, value) => {
    setFormData(prev => ({
      ...prev,
      mealsPerWeek: { ...prev.mealsPerWeek, [type]: value }
    }));
  };

  const toggleDietGoal = (goal) => {
    setFormData(prev => {
      const newGoals = prev.dietGoals.includes(goal)
        ? prev.dietGoals.filter(g => g !== goal)
        : [...prev.dietGoals, goal];
      return { ...prev, dietGoals: newGoals };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/generate-meal-plan', preferences);
      const mealPlan = response.data;
      
      // Save each recipe to the database
      await Promise.all(mealPlan.days.flatMap(day => 
        Object.values(day.meals).map(meal =>
          api.post('/api/recipes', meal)
        )
      ));

      setMealPlan(mealPlan);
      onMealPlanGenerated(mealPlan);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to generate meal plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMacroChange = (macro, value) => {
    const newValue = parseInt(value);
    const oldValue = formData.macros[macro];
    const difference = newValue - oldValue;
    const otherMacros = Object.keys(formData.macros).filter(m => m !== macro);
    const totalOtherMacros = otherMacros.reduce((sum, m) => sum + formData.macros[m], 0);
    const newMacros = { ...formData.macros };
    newMacros[macro] = newValue;

    if (totalOtherMacros === 0 && difference < 0) {
      // All other macros are 0, and we're reducing the current macro
      // Assign the freed value to the first other macro
      const firstOther = otherMacros[0];
      newMacros[firstOther] = Math.abs(difference);
    } else {
      // Proportionally adjust other macros
      otherMacros.forEach(m => {
        const proportion = totalOtherMacros === 0 ? 0 : formData.macros[m] / totalOtherMacros;
        newMacros[m] = Math.max(0, Math.round(formData.macros[m] - (difference * proportion)));
      });
    }

    // Ensure total is 100%
    const total = Object.values(newMacros).reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      const lastMacro = otherMacros[otherMacros.length - 1];
      newMacros[lastMacro] += (100 - total);
    }

    setFormData(prev => ({
      ...prev,
      macros: newMacros
    }));
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
      data: [formData.macros.protein, formData.macros.carbs, formData.macros.fat],
      backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'],
      borderWidth: 0
    }]
  };

  const calorieData = {
    labels: ['Target', 'Current'],
    datasets: [{
      data: [formData.targetCalories, formData.actualCalories],
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
    try {
      setIsLoading(true);
      const payload = {
        preferences: {
          cuisinePreferences: Object.fromEntries(
            Object.entries(cuisinePreferences).filter(([_, value]) => value > 0)
          ),
          dietGoals: formData.dietGoals || [],
          likes: formData.likes.split(',').map(item => item.trim()).filter(Boolean),
          dislikes: formData.dislikes.split(',').map(item => item.trim()).filter(Boolean),
          macros: {
            protein: formData.macros.protein || 30,
            carbs: formData.macros.carbs || 40,
            fat: formData.macros.fat || 30
          },
          mealsPerWeek: {
            breakfast: formData.mealsPerWeek.breakfast || 5,
            lunch: formData.mealsPerWeek.lunch || 5,
            dinner: formData.mealsPerWeek.dinner || 5
          },
          budget: formData.budget || 75
        },
        ingredients: detectedItems || []
      };

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      const response = await api.post('/api/generate-meal-plan', payload);
      console.log('Server response:', response);
      setMealPlan(response.data);
      
      toast.success('Meal Plan Available! Scroll down to view your Personalized Plan.', {
        duration: 4000,
        icon: '📋',
        style: {
          background: '#1a1f2b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      });
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

  const handleApiKeyChange = async (value) => {
    setApiKey(value);
    setError(null); // Reset error state on new attempt
    
    if (value) {
      setIsAuthenticating(true); // Show loading state
      try {
        // Attempt to authenticate with the API key
        await authenticate(value);
        localStorage.setItem('openai_api_key', value);
        toast.success('API key validated successfully');
        
      } catch (error) {
        // Handle different error scenarios with specific messages
        let errorMessage;
        if (error.response?.status === 401) {
          errorMessage = 'Invalid API key. Please check your key and try again.';
        } else if (error.response?.status === 429) {
          errorMessage = 'Too many attempts. Please wait a moment and try again.';
        } else {
          errorMessage = 'Failed to validate API key. Please try again later.';
        }
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Authentication error:', error);
        localStorage.removeItem('openai_api_key');
      } finally {
        setIsAuthenticating(false);
      }
    } else {
      // If value is empty, clear everything
      localStorage.removeItem('openai_api_key');
      clearSession();
    }
  };

  // Add logout handler
  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      clearSession();
      // Show welcome modal by clearing localStorage
      localStorage.removeItem('dontShowWelcome');
      // Refresh the page to reset the app state
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Update preferences when user data is available
  useEffect(() => {
    if (user) {
      // Set initial preferences based on user data
      setPreferences(prev => ({
        ...prev,
        email: user.email,
        userId: user.id
      }));
      setFormData(prev => ({
        ...prev,
        householdMembers: [
          { id: 1, name: user.name, photo: null },
          ...prev.householdMembers.slice(1)
        ]
      }));
    }
  }, [user]);

  // Update member name and photo when user data is available
  useEffect(() => {
    if (user?.name) {
      setFormData(prev => ({
        ...prev,
        householdMembers: [
          { 
            id: 1, 
            name: user.name, 
            photo: user.picture || null  // Use Google profile picture
          },
          ...prev.householdMembers.slice(1)
        ]
      }));
    }
  }, [user?.name, user?.picture]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f2b] to-[#2d3748] text-white p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Meal Planner AI
            </h1>
            <p className="text-gray-400 mt-2">Personalized nutrition planning powered by AI</p>
          </div>
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-[#2A3142] px-4 py-2 rounded-lg border border-[#ffffff1a] hover:bg-[#313d4f] transition-colors group"
            >
              <svg className="w-5 h-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-gray-400 text-xs">Logged in as</span>
                <span className="text-white font-medium group-hover:text-blue-400 transition-colors">{user.name}</span>
              </div>
              <svg 
                className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors ml-2" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
              </svg>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-4 sm:gap-6 mb-8">
          {/* Left column (3): Household, Budget */}
          <div className="col-span-1 sm:col-span-3 lg:col-span-3 flex flex-col gap-6">
            <HouseholdBox 
              formData={formData}
              handlePhotoUpload={handlePhotoUpload}
              updateHouseholdSize={updateHouseholdSize}
              handleChange={handleChange}
              setIsPantryModalOpen={setIsPantryModalOpen}
            />
            <BuildMealPlanWithPantryButton
              onMealPlanGenerated={setMealPlan}
              cuisinePreferences={cuisinePreferences}
              formData={formData}
              detectedItems={detectedItems}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </div>

          {/* Middle column (6): Cuisine Preferences */}
          <div className="col-span-1 sm:col-span-6 lg:col-span-6 flex flex-col gap-6">
            <CuisinePreferences 
              cuisinePreferences={cuisinePreferences} 
              handleCuisineChange={handleCuisineChange} 
            />
          </div>

          {/* Right column (3): Macronutrient Split */}
          <div className="col-span-1 sm:col-span-3 lg:col-span-3 flex flex-col gap-6">
            <MacronutrientSplit 
              formData={formData} 
              handleMacroChange={handleMacroChange} 
            />
          </div>
        </div>

        {/* Dietary Goals & Fitbit side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-4 sm:gap-6 mb-6">
          <div className="col-span-1 sm:col-span-6 lg:col-span-6">
            <DietaryGoals dietOptions={dietOptions} formData={formData} toggleDietGoal={toggleDietGoal} />
          </div>
          <div className="col-span-1 sm:col-span-6 lg:col-span-6 flex items-stretch">
            <div className="w-full flex flex-col justify-center">
              <FitbitLogin />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-4 sm:gap-6 mb-6">
          <div className="col-span-1 sm:col-span-6 lg:col-span-6">
            <DailyCalories formData={formData} handleChange={handleChange} calorieData={calorieData} />
          </div>
          <div className="col-span-1 sm:col-span-6 lg:col-span-6">
            <MealsPerWeek formData={formData} handleMealsChange={handleMealsChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-4 sm:gap-6 mb-6">
          <div className="col-span-1 sm:col-span-6 lg:col-span-4">
            <MealPreferences formData={formData} handleChange={handleChange} />
          </div>
          <div className="col-span-1 sm:col-span-6 lg:col-span-4">
            <PreferredFoods formData={formData} />
          </div>
          <div className="col-span-1 sm:col-span-6 lg:col-span-4">
            <AvoidedFoods formData={formData} />
          </div>
        </div>

        {/* Upload Receipt */}
        <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-4 sm:gap-6 mb-6">
          <div className="col-span-1 sm:col-span-6 lg:col-span-12">
            <UploadReceipt 
              handleReceiptUpload={handleReceiptUpload} 
              isParsingReceipt={isParsingReceipt} 
              receiptItems={receiptItems} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-4 sm:gap-6">
          <div className="col-span-1 sm:col-span-6 lg:col-span-12 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] mb-8">
            <h3 className="text-sm text-gray-400 mb-4">OpenAI API Key</h3>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="Enter your OpenAI API key"
                  className={`flex-1 px-4 py-2 bg-[#2A3142] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                    error ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                  disabled={isAuthenticating}
                />
                <button
                  onClick={() => handleApiKeyChange('')}
                  className="px-4 py-2 bg-[#2A3142] text-gray-400 rounded-lg hover:bg-[#313748]"
                  disabled={isAuthenticating}
                >
                  Clear
                </button>
              </div>
              
              {/* Error message */}
              {error && (
                <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Loading state */}
              {isAuthenticating && (
                <div className="text-sm text-blue-400 bg-blue-400/10 p-3 rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Validating API key...
                </div>
              )}

              <p className="text-xs text-gray-500">
                Your API key is stored locally and never sent to our servers
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-4 sm:gap-6 mb-6">
          <div className="col-span-1 sm:col-span-6 lg:col-span-6">
            <button
              onClick={handleGenerateMealPlan}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow hover:from-blue-600 hover:to-purple-600 transition-all"
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Your Meal Plan'}
            </button>
          </div>
          <div className="col-span-1 sm:col-span-6 lg:col-span-6">
            <button
              onClick={() => setShowRecipeList((prev) => !prev)}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg shadow hover:from-green-600 hover:to-teal-600 transition-all"
            >
              {showRecipeList ? 'Hide Recipe List' : 'View Recipe List'}
            </button>
          </div>
        </div>
        {showRecipeList && (
          <div className="mb-8">
            <RecipeList />
          </div>
        )}

        {mealPlan && (
          <div className="mb-8">
            {mealPlan.generatedWithPantry && (
              <div className="mb-4 flex items-center gap-3">
                {/*<span className="inline-block bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium border border-green-500/30">
                  🍽️ Generated with {mealPlan.pantryItemCount} Pantry Items
                </span>*/}
              </div>
            )}
            <MealPlanResults 
              mealPlan={mealPlan}
              viewMode={viewMode}
              setViewMode={setViewMode}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
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