import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

const Layout = ({ children, activeTab, setActiveTab, user, handleLogout, onSignInClick }) => {
  const { themeMode } = useTheme();
  
  return (
    <div className={`min-h-screen ${
      themeMode === 'dark' 
        ? 'bg-gradient-to-br from-[#1a1f2b] to-[#2d3748] text-white'
        : 'bg-gradient-to-br from-gray-50 to-white text-gray-900'
    }`}>
      {/* Header with Navigation */}
      <div className={`${
        themeMode === 'dark'
          ? 'bg-[#252B3B]/50 backdrop-blur-sm border-b border-[#ffffff0f]'
          : 'bg-white/50 backdrop-blur-sm border-b border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold">NutriIQ</h1>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('planner')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'planner'
                      ? 'bg-blue-500 text-white'
                      : themeMode === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Meal Planner
                </button>
                <button
                  onClick={() => setActiveTab('recipes')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'recipes'
                      ? 'bg-blue-500 text-white'
                      : themeMode === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Recipe Library
                </button>
              </div>
              <ThemeToggle variant="switch" size="sm" showIcons={true} />
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className={`text-sm ${themeMode === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className={`text-sm transition-colors ${
                      themeMode === 'dark' 
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignInClick}
                  className={`text-sm transition-colors ${
                    themeMode === 'dark' 
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
};

export default Layout; 