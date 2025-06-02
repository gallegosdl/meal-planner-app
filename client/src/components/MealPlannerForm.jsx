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
import WelcomeModal from './WelcomeModal';

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

const MealPlannerForm = ({ onMealPlanGenerated }) => {
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

  const [storeComparison, setStoreComparison] = useState(null);
  const [isComparingStores, setIsComparingStores] = useState(false);

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

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
  const storeOptions = ['Smiths', 'Albertsons', 'Walmart', 'Whole Foods', 'Trader Joe\'s'];

  const [activeTab, setActiveTab] = useState(1);
  const [viewMode, setViewMode] = useState('tabs'); // 'tabs', 'tiles', 'calendar', or 'recipes'

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setShowWelcomeModal(true);
    }
  }, []);

  const handleCloseWelcomeModal = (dontShowAgain) => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenWelcome', 'true');
    }
    setShowWelcomeModal(false);
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
    
    // Calculate how to distribute the difference among other macros
    const otherMacros = Object.keys(formData.macros).filter(m => m !== macro);
    const totalOtherMacros = otherMacros.reduce((sum, m) => sum + formData.macros[m], 0);
    
    const newMacros = { ...formData.macros };
    newMacros[macro] = newValue;

    // Proportionally adjust other macros
    otherMacros.forEach(m => {
      const proportion = formData.macros[m] / totalOtherMacros;
      newMacros[m] = Math.max(0, Math.round(formData.macros[m] - (difference * proportion)));
    });

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

  const handleCompareStores = async () => {
    try {
      setIsComparingStores(true);
      
      const response = await api.post('/api/instacart/compare-stores', {
        shoppingListUrl: listUrl,
        stores: ['Smart & Final', 'Albertsons', 'Ralphs']
      });

      if (response.data.success) {
        setStoreComparison(response.data.data);
      } else {
        throw new Error('Failed to compare stores');
      }
    } catch (error) {
      console.error('Store comparison failed:', error);
      toast.error('Failed to compare store prices');
    } finally {
      setIsComparingStores(false);
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
      console.log('Server response:', response.data);
      setMealPlan(response.data);
      
      // Add success toast notification
      toast.success('Meal Plan Available! Scroll down to view your Personalized Plan.', {
        duration: 4000,
        icon: '📋',
        style: {
          background: '#1a1f2b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      });
      
      // After meal plan is generated, compare stores
      if (response.shoppingListUrl) {
        await handleCompareStores();
      }
    } catch (error) {
      console.error('Error details:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to generate meal plan');
      
      // Add error toast notification
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
        // Show success message using toast
        toast.success('API key validated successfully');
        
      } catch (error) {
        // Handle different error scenarios with specific messages
        if (error.response?.status === 401) {
          // 401: Unauthorized - Invalid API key
          setError('Invalid API key. Please check your key and try again.');
        } else if (error.response?.status === 429) {
          // 429: Too Many Requests - Rate limiting
          setError('Too many attempts. Please wait a moment and try again.');
        } else {
          // Generic error for other cases
          setError('Failed to validate API key. Please try again later.');
        }
        console.error('Authentication error:', error);
      } finally {
        // Always reset loading state
        setIsAuthenticating(false);
      }
    } else {
      // If value is empty, clear the session
      clearSession();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f2b] to-[#2d3748] text-white p-6">
      {showWelcomeModal && (
        <WelcomeModal onClose={handleCloseWelcomeModal} />
      )}
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Meal Planner AI</h1>
          <p className="text-gray-400 mt-2">Personalized nutrition planning powered by AI</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Household Container */}
          <div className="col-span-1 sm:col-span-3 lg:col-span-3 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
            <h2 className="text-xl font-semibold text-white mb-4">Household</h2>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg 
                  className="w-6 h-6 text-blue-400" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <span className="text-sm text-gray-400">Household</span>
                <div className="text-2xl font-semibold">{formData.householdSize}</div>
              </div>
            </div>

            {/* Member Photos Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {formData.householdMembers.map((member) => (
                <div key={member.id} className="relative group">
                  <label 
                    className={`block w-full aspect-square rounded-xl cursor-pointer overflow-hidden
                      ${member.photo ? 'bg-transparent' : 'bg-[#2A3142] hover:bg-[#313d4f]'}`}
                  >
                    {member.photo ? (
                      <img 
                        src={member.photo} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">👤</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(member.id, e.target.files[0])}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs text-white">Change Photo</span>
                    </div>
                  </label>
                  <div className="text-xs text-gray-400 text-center mt-1 truncate">
                    {member.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Size Controls */}
            <div className="flex justify-between items-center mt-4">
              <button 
                className="w-12 h-12 bg-[#2A3142] rounded-xl flex items-center justify-center hover:bg-[#313d4f] transition-colors" 
                onClick={() => updateHouseholdSize(Math.max(1, formData.householdSize - 1))}
              >
                -
              </button>
              <button 
                className="w-12 h-12 bg-[#2A3142] rounded-xl flex items-center justify-center hover:bg-[#313d4f] transition-colors"
                onClick={() => updateHouseholdSize(formData.householdSize + 1)}
              >
                +
              </button>
            </div>

            {/* Weekly Budget */}
            <div className="pt-6">
              <h2 className="text-xl font-semibold text-white mb-4">Weekly Budget</h2>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-400">Weekly Budget</span>
              </div>
              <div className="text-2xl mb-2">${formData.budget}</div>
              <input 
                type="range"
                min="30"
                max="300"
                className="w-full accent-blue-500"
                value={formData.budget}
                onChange={(e) => handleChange('budget', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Cuisine Preferences Container */}
          <div className="col-span-1 sm:col-span-6 lg:col-span-6 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
            <h2 className="text-xl font-semibold text-white mb-4">Cuisine Preferences</h2>
            <p className="text-sm text-gray-400 mb-4">
              Adjust the sliders to set your cuisine preferences (total cannot exceed 100%)
            </p>

            {/* Donut Chart */}
            <div className="h-48 mb-6">
              <Doughnut 
                data={{
                  labels: Object.keys(cuisinePreferences).map(cuisine => 
                    cuisine.replace(/([A-Z])/g, ' $1').trim()
                  ),
                  datasets: [{
                    data: Object.values(cuisinePreferences),
                    backgroundColor: [
                      '#FF6384', // cajun
                      '#36A2EB', // creole
                      '#FFCE56', // mexican
                      '#4BC0C0', // italian
                      '#9966FF', // greek
                      '#FF9F40', // chinese
                      '#EA80FC', // japanese
                      '#00E676', // thai
                      '#FF5252'  // middleEastern
                    ],
                    borderWidth: 0
                  }]
                }}
                options={{
                  maintainAspectRatio: false,
                  cutout: '70%',
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        color: '#9ca3af',
                        font: { size: 11 },
                        padding: 10
                      }
                    }
                  }
                }}
              />
            </div>

            {/* Sliders */}
            <div className="space-y-3">
              {Object.entries(cuisinePreferences).map(([cuisine, value]) => (
                <div key={cuisine} className="flex flex-col">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-300">{cuisine.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-blue-400">{value}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => handleCuisineChange(cuisine, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-full accent-blue-500"
                  />
                </div>
              ))}
            </div>

            {/* Total Display */}
            <div className="flex justify-between mt-4">
              <span className="text-gray-300">Total</span>
              <span className={`font-medium ${
                Object.values(cuisinePreferences).reduce((a, b) => a + b, 0) === 100 
                  ? 'text-green-400' 
                  : 'text-yellow-400'
              }`}>
                {Object.values(cuisinePreferences).reduce((a, b) => a + b, 0)}%
              </span>
            </div>
          </div>

          {/* Macronutrient Split Container */}
          <div className="col-span-1 sm:col-span-3 lg:col-span-3 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
            <h2 className="text-xl font-semibold text-white mb-4">Macronutrient Split</h2>
            <div className="h-48 mb-6">
              <Doughnut 
                data={macroData} 
                options={{ 
                  maintainAspectRatio: false,
                  cutout: '70%',
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        color: '#9ca3af',
                        font: { size: 11 },
                        padding: 10,
                        usePointStyle: false
                      }
                    }
                  }
                }} 
              />
            </div>

            {/* Macro Sliders */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Protein</span>
                  <span>{formData.macros.protein}%</span>
                </div>
                <input 
                  type="range"
                  min="10"
                  max="60"
                  value={formData.macros.protein}
                  onChange={(e) => handleMacroChange('protein', e.target.value)}
                  className="w-full h-1.5 bg-[#2A3142] rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Carbs</span>
                  <span>{formData.macros.carbs}%</span>
                </div>
                <input 
                  type="range"
                  min="10"
                  max="60"
                  value={formData.macros.carbs}
                  onChange={(e) => handleMacroChange('carbs', e.target.value)}
                  className="w-full h-1.5 bg-[#2A3142] rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Fat</span>
                  <span>{formData.macros.fat}%</span>
                </div>
                <input 
                  type="range"
                  min="10"
                  max="60"
                  value={formData.macros.fat}
                  onChange={(e) => handleMacroChange('fat', e.target.value)}
                  className="w-full h-1.5 bg-[#2A3142] rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>
            </div>
          </div>

          {/* Dietary Goals */}
          <div className="col-span-1 sm:col-span-6 lg:col-span-12 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
            <h3 className="text-sm text-gray-400 mb-4">Dietary Goals</h3>
            {Object.entries(dietOptions).map(([category, options]) => (
              <div key={category} className="mb-4">
                <h4 className="text-xs text-gray-500 mb-2">{category}</h4>
                <div className="flex flex-wrap gap-2">
                  {options.map((goal) => (
                    <button
                      key={goal}
                      onClick={() => toggleDietGoal(goal)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        formData.dietGoals.includes(goal)
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#2A3142] text-gray-400 hover:bg-[#313748]'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Calories Card */}
          <div className="col-span-1 sm:col-span-6 lg:col-span-6 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm text-gray-400">Daily Calories</h3>
              <select 
                className="bg-[#2A3142] text-sm rounded-lg px-3 py-1.5 border-none focus:ring-1 focus:ring-blue-500"
                onChange={(e) => {
                  const goals = {
                    maintain: 2000,
                    lose: 1800,
                    gain: 2300
                  };
                  handleChange('targetCalories', goals[e.target.value]);
                }}
              >
                <option value="maintain">Maintain Weight</option>
                <option value="lose">Lose Weight (-200 cal)</option>
                <option value="gain">Gain Muscle (+300 cal)</option>
              </select>
            </div>
            <div className="h-48">
              <Bar 
                data={calorieData} 
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    y: { 
                      grid: { color: '#2A3142' }, 
                      border: { display: false },
                      ticks: { color: '#9ca3af' }
                    },
                    x: { 
                      grid: { display: false }, 
                      border: { display: false },
                      ticks: { color: '#9ca3af' }
                    }
                  },
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#1E2433',
                      titleColor: '#9ca3af',
                      bodyColor: '#fff',
                      padding: 12,
                      cornerRadius: 8
                    }
                  }
                }} 
              />
            </div>
          </div>

          {/* Middle Row */}
          <div className="col-span-1 sm:col-span-6 lg:col-span-6 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
            <h3 className="text-sm text-gray-400 mb-4">Meals Per Week</h3>
            <div className="space-y-3">
              {['breakfast', 'lunch', 'dinner'].map(meal => (
                <div key={meal} className="flex items-center justify-between bg-[#2A3142] p-3 rounded">
                  <span className="capitalize">{meal}</span>
                  <div className="flex items-center gap-3">
                    <button className="w-8 h-8 bg-[#313748] rounded" onClick={() => handleMealsChange(meal, Math.max(0, formData.mealsPerWeek[meal] - 1))}>-</button>
                    <span className="w-8 text-center">{formData.mealsPerWeek[meal]}</span>
                    <button className="w-8 h-8 bg-[#313748] rounded" onClick={() => handleMealsChange(meal, Math.min(7, formData.mealsPerWeek[meal] + 1))}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meal Preferences Row */}
          <div className="col-span-1 sm:col-span-6 lg:col-span-4 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
            <h2 className="text-xl font-semibold text-white mb-4">Meal Preferences</h2>
            <div className="space-y-6">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Foods You Like</label>
                <input
                  type="text"
                  value={formData.likes}
                  onChange={(e) => handleChange('likes', e.target.value)}
                  placeholder="e.g. chicken, eggs"
                  className="w-full bg-[#2A3142] rounded-lg p-3 text-gray-300"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Foods to Avoid</label>
                <input
                  type="text"
                  value={formData.dislikes}
                  onChange={(e) => handleChange('dislikes', e.target.value)}
                  placeholder="e.g. mushrooms"
                  className="w-full bg-[#2A3142] rounded-lg p-3 text-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Preferred Foods Display */}
          <div className="col-span-1 sm:col-span-6 lg:col-span-4 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
            <h2 className="text-xl font-semibold text-white mb-4">Preferred Foods</h2>
            <div className="bg-[#2A3142] rounded-lg p-4 min-h-[200px]">
              {formData.likes.split(',').map((item, index) => (
                item.trim() && (
                  <span 
                    key={index}
                    className="inline-block bg-blue-500/20 text-blue-400 rounded-full px-3 py-1 text-sm mr-2 mb-2"
                  >
                    {item.trim()}
                  </span>
                )
              ))}
            </div>
          </div>

          {/* Avoided Foods Display */}
          <div className="col-span-1 sm:col-span-6 lg:col-span-4 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
            <h2 className="text-xl font-semibold text-white mb-4">Avoided Foods</h2>
            <div className="bg-[#2A3142] rounded-lg p-4 min-h-[200px]">
              {formData.dislikes.split(',').map((item, index) => (
                item.trim() && (
                  <span 
                    key={index}
                    className="inline-block bg-red-500/20 text-red-400 rounded-full px-3 py-1 text-sm mr-2 mb-2"
                  >
                    {item.trim()}
                  </span>
                )
              ))}
            </div>
          </div>

          <div className="col-span-1 sm:col-span-6 lg:col-span-12 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
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

          <div className="col-span-1 sm:col-span-6 lg:col-span-12 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
            <h3 className="text-sm text-gray-400 mb-4">Upload Receipt</h3>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptUpload}
                className="hidden"
                id="receipt-upload"
              />
              <label
                htmlFor="receipt-upload"
                className="px-4 py-2 bg-[#2A3142] rounded-lg cursor-pointer hover:bg-[#313748] transition-colors"
              >
                Select Receipt Image
              </label>
              {isParsingReceipt && <span className="text-gray-400">Parsing receipt...</span>}
            </div>
            {receiptItems.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm text-gray-400 mb-2">Detected Items:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {receiptItems.map((item, index) => (
                    <div key={index} className="bg-[#2A3142] p-2 rounded">
                      <div className="text-sm">{item.name}</div>
                      <div className="text-xs text-gray-400">${item.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleGenerateMealPlan}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow hover:from-blue-600 hover:to-purple-600 transition-all"
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Your Meal Plan'}
        </button>

        {mealPlan && (
          <div className="mt-8 space-y-6">
            {/* Header and buttons container - stack on mobile */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
              <h2 className="text-2xl font-bold">Your Meal Plan</h2>
              
              {/* Controls container - stack and wrap buttons on mobile */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <SendToInstacartButton mealPlan={mealPlan} />
                
                {/* View Toggle Buttons - wrap on mobile */}
                <div className="grid grid-cols-2 sm:flex gap-2">
                  <button
                    onClick={() => setViewMode('tabs')}
                    className={`px-4 py-2 rounded-lg text-sm sm:text-base ${
                      viewMode === 'tabs' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-[#2A3142] text-gray-400'
                    }`}
                  >
                    Detailed View
                  </button>
                  <button
                    onClick={() => setViewMode('recipes')}
                    className={`px-4 py-2 rounded-lg text-sm sm:text-base ${
                      viewMode === 'recipes' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-[#2A3142] text-gray-400'
                    }`}
                  >
                    Recipe Library
                  </button>
                  <button
                    onClick={() => setViewMode('tiles')}
                    className={`px-4 py-2 rounded-lg text-sm sm:text-base ${
                      viewMode === 'tiles' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-[#2A3142] text-gray-400'
                    }`}
                  >
                    Draggable Tiles
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-4 py-2 rounded-lg text-sm sm:text-base ${
                      viewMode === 'calendar' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-[#2A3142] text-gray-400'
                    }`}
                  >
                    Calendar View
                  </button>
                </div>
              </div>
            </div>

            {/* Original Tab View */}
            {viewMode === 'tabs' && (
              <>
                <div className="flex border-b border-[#ffffff1a] mb-6">
                  {[1, 2, 3, 4, 5].map((dayNum) => (
                    <button
                      key={dayNum}
                      onClick={() => setActiveTab(dayNum)}
                      className={`px-4 py-2 -mb-px ${
                        activeTab === dayNum
                          ? 'text-blue-500 border-b-2 border-blue-500 font-medium'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Day {dayNum}
                    </button>
                  ))}
                </div>

                {/* Original Tab Content */}
                {mealPlan.days.map((day) => (
                  <div
                    key={day.day}
                    className={`${activeTab === day.day ? 'block' : 'hidden'} mb-8`}
                  >
                    <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
                      <h3 className="text-xl font-semibold mb-4">Day {day.day}</h3>
                      {Object.entries(day.meals).map(([mealType, meal]) => (
                        <div key={mealType} className="mb-6">
                          <h4 className="text-lg font-medium capitalize mb-3">
                            {mealType}: {meal.name}
                          </h4>
                          <div className="ml-4 space-y-4">
                            <div>
                              <h5 className="font-medium mb-2">Ingredients:</h5>
                              <ul className="list-disc ml-4 space-y-1">
                                {meal.ingredients.map((ing, i) => (
                                  <li key={i}>
                                    {ing.name} - {ing.amount}
                                    {ing.cost && ` ($${ing.cost})`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h5 className="font-medium mb-2">Instructions:</h5>
                              <p className="ml-4 text-gray-300">{meal.instructions}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Original Placeholder Days */}
                {[3, 4, 5].map((dayNum) => (
                  <div
                    key={dayNum}
                    className={`${activeTab === dayNum ? 'block' : 'hidden'} mb-8`}
                  >
                    <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
                      <div className="text-center text-gray-400 py-8">
                        Day {dayNum} meal plan not generated yet.
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Add Recipe Library View */}
            {viewMode === 'recipes' && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-6">Recipe Library</h2>
                <RecipeList />
              </div>
            )}

            {/* New Views wrapped in OAuth provider */}
            <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
              {viewMode === 'tiles' && <DraggableMealPlan mealPlan={mealPlan} />}
              {viewMode === 'calendar' && <CalendarMealPlan mealPlan={mealPlan} />}
            </GoogleOAuthProvider>

            {/* Add store comparison */}
            <StoreComparison 
              comparisonData={storeComparison}
              isLoading={isComparingStores}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MealPlannerForm;