import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MealPlannerForm from './components/MealPlannerForm';
import RecipeList from './components/RecipeList';
import WelcomeModal from './components/WelcomeModal';
import Privacy from './pages/legal/Privacy';
import Terms from './pages/legal/Terms';

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
        const response = await fetch('/api/auth/verify-session', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
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
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Router>
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

        {/* Main Content with Routing */}
        <div className="max-w-7xl mx-auto p-6">
          <Routes>
            <Route path="/legal/privacy" element={<Privacy />} />
            <Route path="/legal/terms" element={<Terms />} />
            <Route
              path="/"
              element={
                activeTab === 'planner' ? (
                  <MealPlannerForm onMealPlanGenerated={handleMealPlanGenerated} />
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">Recipe Library</h2>
                    <RecipeList />
                  </div>
                )
              }
            />
          </Routes>
        </div>

        {/* Welcome Modal */}
        {showWelcome && (
          <WelcomeModal onClose={handleWelcomeClose} />
        )}
      </div>
    </Router>
  );
}