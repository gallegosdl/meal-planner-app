import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MealPlannerForm from './components/MealPlannerForm';
import WelcomeModal from './components/WelcomeModal';
import api from './services/api';

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
    try {
      await api.post('/api/auth/logout');
      setUser(null);
      // Clear session storage
      sessionStorage.removeItem('google_access_token');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Router>
      <div className="App">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#2A3142',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#4ade80',
                secondary: '#2A3142',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#2A3142',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={
            <>
              {showWelcome && (
                <WelcomeModal 
                  onClose={handleWelcomeClose}
                />
              )}
              <MealPlannerForm user={user} handleLogout={handleLogout} />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 