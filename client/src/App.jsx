import React, { useState, useEffect } from 'react';
import MealPlannerForm from './components/MealPlannerForm';
import RecipeList from './components/RecipeList';
import WelcomeModal from './components/WelcomeModal';
import api from './services/api';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// Add OAuth Error component
const OAuthError = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const error = params.get('error');
  
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Failed
          </h2>
          
          <p className="text-gray-600 mb-6">
            {error ? decodeURIComponent(error) : 'There was an error during authentication.'}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'X_AUTH_ERROR', 
                    error: error || 'Authentication failed' 
                  }, window.location.origin);
                  window.close();
                } else {
                  window.location.href = '/';
                }
              }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            
            <button
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  window.location.href = '/';
                }
              }}
              className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('planner');
  const [generatedMealPlan, setGeneratedMealPlan] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [user, setUser] = useState(null);

  // Check if welcome modal should be shown and verify session
  useEffect(() => {
    const shouldShow = !localStorage.getItem('dontShowWelcome');
    setShowWelcome(shouldShow);

    // Verify session on load
    const checkSession = async () => {
      try {
        const response = await api.get('/api/auth/verify-session');
        setUser(response.data);
      } catch (error) {
        console.error('Session verification failed:', error);
      }
    };

    checkSession();
  }, []);

  const handleMealPlanGenerated = (mealPlan) => {
    setGeneratedMealPlan(mealPlan);
  };

  const handleWelcomeClose = () => {
    setShowWelcome(false);
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={
            <div className="min-h-screen bg-gradient-to-br from-[#1a1f2b] to-[#2d3748] text-white">
              {/* Header with Navigation */}
              <div className="bg-[#252B3B]/50 backdrop-blur-sm border-b border-[#ffffff0f]">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="flex items-center justify-between h-16">
                    <h1 className="text-xl font-bold">Meal Planner AI</h1>
                    <div className="flex items-center space-x-4">
                      <div className="flex space-x-4">
                        <button
                          onClick={() => setActiveTab('planner')}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            activeTab === 'planner'
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-300 hover:text-white'
                          }`}
                        >
                          Meal Planner
                        </button>
                        <button
                          onClick={() => setActiveTab('recipes')}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            activeTab === 'recipes'
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-300 hover:text-white'
                          }`}
                        >
                          Recipe Library
                        </button>
                      </div>
                      {user ? (
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-300">{user.email}</span>
                          <button
                            onClick={handleLogout}
                            className="text-sm text-gray-400 hover:text-white transition-colors"
                          >
                            Logout
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowWelcome(true)}
                          className="text-sm text-gray-400 hover:text-white transition-colors"
                        >
                          Sign In
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="max-w-7xl mx-auto p-6">
                {activeTab === 'planner' ? (
                  <MealPlannerForm onMealPlanGenerated={handleMealPlanGenerated} />
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">Recipe Library</h2>
                    <RecipeList />
                  </div>
                )}
              </div>

              {/* Welcome Modal */}
              {showWelcome && (
                <WelcomeModal onClose={handleWelcomeClose} />
              )}
            </div>
          } />
          <Route path="/auth/error" element={<OAuthError />} />
        </Routes>
      </div>
    </Router>
  );
}