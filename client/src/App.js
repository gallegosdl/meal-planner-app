import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';
import MealPlannerForm from './components/MealPlannerForm';
import WelcomeModal from './components/WelcomeModal';

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [user, setUser] = useState(null);

  // Check if welcome modal should be shown
  useEffect(() => {
    const shouldShow = !localStorage.getItem('dontShowWelcome');
    setShowWelcome(shouldShow);
  }, []);

  const handleWelcomeClose = (dontShowAgain) => {
    if (dontShowAgain) {
      localStorage.setItem('dontShowWelcome', 'true');
    }
    setShowWelcome(false);
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        console.log('Google login response:', response);
        setUser(response);
        setShowWelcome(false);
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Login Failed:', error);
      throw error;
    },
    scope: 'email profile',
    flow: 'auth-code',
    ux_mode: 'popup'
  });

  return (
    <div className="App">
      <MealPlannerForm />
      {showWelcome && (
        <WelcomeModal 
          onClose={handleWelcomeClose}
          onGoogleLogin={handleGoogleLogin}
        />
      )}
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
    </div>
  );
}

export default App; 