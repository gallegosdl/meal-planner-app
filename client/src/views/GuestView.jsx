// client/src/views/GuestView.jsx
import React, { useState } from 'react';
import axios from 'axios';
import UserMealPlanContainer from '../components/UserMealPlanContainer';
import { useTheme } from '../contexts/ThemeContext';
import AuthModal from '../components/AuthModal';

const GuestView = ({ setUser }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestData, setGuestData] = useState(null);
  const [error, setError] = useState(null);

  const { themeMode } = useTheme();
  const isDarkMode = themeMode === 'dark';

  const handleAuthModalClose = (userData) => {
    setShowAuthModal(false);
    if (userData?.sessionToken) {
      setUser(userData);
    }
  };

  // TRANSFORM FUNCTION - flat array to app's nested shape
  const transformGuestData = (flatData) => {
    const transformed = { dates: {} };

    flatData.forEach((item) => {
      const dateKey = item.date;
      if (!transformed.dates[dateKey]) {
        transformed.dates[dateKey] = { meals: {} };
      }
      transformed.dates[dateKey].meals[item.meal_type] = { ...item };
    });

    return transformed;
  };

  const handleToggleDemo = async () => {
    if (showDemo) {
      setShowDemo(false);
      setGuestData(null);
      // Reset user back to null to show guest view
      setUser(null);
      return;
    }
  
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/meal-plans/guest-meal-plans');
      // if the JSON is already in the expected shape
      setGuestData(res.data);
      setShowDemo(true);
    } catch (err) {
      console.error('Error fetching guest meal plan:', err);
      setError('Failed to load demo meal plan');
    } finally {
      setLoading(false);
    }
  };

  // 👉 If demo is ON, treat guest as logged-in user with demo data
  if (showDemo && guestData) {
    // Set the user as a guest user so they see the full interface
    const guestUser = {
      id: "guest", 
      email: "demo@guest.com",
      guest: true,
      guestData: guestData
    };
    
    // Update the parent to show the full logged-in interface
    setUser(guestUser);
    return null; // Let the main app render MealPlannerForm
  }

  // ➜ Otherwise show regular guest screen
  return (
    <div
      className={`h-full rounded-2xl p-6 border ${
        isDarkMode
          ? 'bg-[#252B3B]/50 backdrop-blur-sm border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]'
          : 'bg-gradient-to-br from-gray-50 to-white text-gray-900'
      }`}
    >
      {/* Header Section */}
      <div className="pt-8 md:pt-12 mx-auto">
        <div
          className={`mx-4 rounded-xl ${
            isDarkMode
              ? 'bg-[#252B3B]/50 backdrop-blur-sm border border-[#ffffff0f]'
              : 'bg-white/50 backdrop-blur-sm border border-gray-200'
          }`}
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <img
                  src="/images/NutriIQ-dark-preferred.png"
                  alt="NutriIQ Logo"
                  className="w-8 h-8 mr-3"
                />
                <h1 className="text-xl font-bold">
                  Nutri <span className="text-blue-400">IQ</span>
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div
          className={`rounded-xl p-8 ${
            isDarkMode
              ? 'bg-[#252B3B]/50 backdrop-blur-sm border border-[#ffffff0f]'
              : 'bg-white/50 backdrop-blur-sm border border-gray-200'
          }`}
        >
          <div className="text-center mb-8">
            <h2
              className={`text-3xl font-bold mb-4 border-b-2 border-blue-500/30 pb-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              Welcome to Nutri <span className="text-blue-400">IQ</span>
            </h2>
            <p
              className={`text-lg mb-6 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              Experience personalized meal planning powered by AI
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div
              className={`rounded-lg p-6 ${
                isDarkMode
                  ? 'bg-[#1a1f2b] border border-[#ffffff0f]'
                  : 'bg-gray-100'
              }`}
            >
              <h3
                className={`text-xl font-semibold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                <span className="text-yellow-400">Guest Mode Limitations</span>
              </h3>
              <ul
                className={`space-y-3 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                <li>• Meal plans are not saved</li>
                <li>• No personalized recommendations</li>
                <li>• Limited recipe customization</li>
                <li>• No progress tracking</li>
              </ul>
            </div>

            <div
              className={`rounded-lg p-6 ${
                isDarkMode
                  ? 'bg-[#1a1f2b] border border-[#ffffff0f]'
                  : 'bg-gray-100'
              }`}
            >
              <h3
                className={`text-xl font-semibold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                <span className="text-blue-400">Create an Account to</span>
              </h3>
              <ul
                className={`space-y-3 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                <li>• Save and track meal plans</li>
                <li>• Personalized AI recommendations</li>
                <li>• Access premium recipes</li>
                <li>• Sync with fitness apps</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setShowAuthModal(true)}
              className={`inline-block px-6 py-3 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Sign Up Now
            </button>
          </div>

          <div className="mt-6 flex justify-center items-center space-x-4">
            <label
              className={`${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              } font-medium`}
            >
              Demo Meal Plan Details
            </label>
            <button
              onClick={handleToggleDemo}
              className={`px-4 py-2 rounded-full transition-colors ${
                showDemo
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-400 hover:bg-gray-500 text-white'
              }`}
              disabled={loading}
            >
              {loading ? 'Loading...' : showDemo ? 'ON' : 'OFF'}
            </button>
          </div>

          {error && (
            <p className="mt-2 text-center text-red-500">{error}</p>
          )}
        </div>
      </div>

      {showAuthModal && <AuthModal onClose={handleAuthModalClose} />}
    </div>
  );
};

export default GuestView;
