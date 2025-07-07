import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MealPlannerForm from './components/MealPlannerForm';
import WelcomeModal from './components/WelcomeModal';
import api, { clearSession } from './services/api';
import { ThemeProvider } from './contexts/ThemeContext';
import { THEME_MODES } from './styles/themes';
import { useTheme } from './contexts/ThemeContext';

// Wrap the main content in a theme-aware container
const ThemedApp = ({ children }) => {
  const { themeMode } = useTheme();
  
  return (
    <div className={`min-h-screen ${
      themeMode === 'dark' 
        ? 'bg-gradient-to-br from-[#1a1f2b] to-[#2d3748] text-white'
        : 'bg-gradient-to-br from-gray-50 to-white text-gray-900'
    }`}>
      {children}
    </div>
  );
};

function App() {
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

  const handleWelcomeClose = (dontShowAgain, userData) => {
    if (dontShowAgain) {
      localStorage.setItem('dontShowWelcome', 'true');
    }
    if (userData) {
      console.log('Setting user data from authentication:', userData);
      setUser(userData);
    }
    setShowWelcome(false);
  };

  const handleLogout = async () => {
    console.log('🔥 LOGOUT CLICKED - Starting logout process...');
    
    try {
      // Show loading toast
      toast.loading('Logging out...', { id: 'logout' });
      
      // Clear session token first
      console.log('🔥 Clearing session token...');
      clearSession();
      
      // Try to call logout endpoint (may not exist)
      try {
        console.log('🔥 Calling logout endpoint...');
        await api.post('/api/auth/logout');
        console.log('🔥 Logout endpoint called successfully');
      } catch (apiError) {
        // If logout endpoint doesn't exist, that's okay - we already cleared the session
        console.log('🔥 Logout endpoint not available, but session cleared locally');
      }
      
      // Clear user state
      console.log('🔥 Clearing user state...');
      setUser(null);
      
      // Clear other session storage items
      console.log('🔥 Clearing other session storage...');
      sessionStorage.removeItem('google_access_token');
      sessionStorage.removeItem('session_token'); // Extra cleanup
      
      console.log('🔥 User logged out successfully');
      
      // Show success toast
      toast.success('Logged out successfully!', { id: 'logout' });
      
      // Force a small delay to show the success message
      setTimeout(() => {
        window.location.reload(); // Force refresh to ensure clean state
      }, 1000);
      
    } catch (error) {
      console.error('🔥 Logout failed:', error);
      // Even if logout fails, clear user state and session
      clearSession();
      setUser(null);
      sessionStorage.removeItem('google_access_token');
      sessionStorage.removeItem('session_token');
      
      toast.error('Logout failed, but session cleared locally', { id: 'logout' });
      
      // Force refresh even on error
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <ThemeProvider defaultTheme={THEME_MODES.DARK}>
      <Router>
        <ThemedApp>
          <Routes>
            <Route 
              path="/" 
              element={
                <>
                  <MealPlannerForm user={user} handleLogout={handleLogout} />
                  {showWelcome && (
                    <WelcomeModal 
                      onClose={handleWelcomeClose} 
                    />
                  )}
                </>
              } 
            />
          </Routes>
          <Toaster position="top-right" />
        </ThemedApp>
      </Router>
    </ThemeProvider>
  );
}

export default App; 