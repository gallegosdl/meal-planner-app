import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { THEME_MODES } from './styles/themes';
import AppRouter from './routes';
import { authHandler } from './handlers/authHandler';
import WelcomeModal from './components/WelcomeModal';

export default function App() {
  const [user, setUser] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const shouldShow = !localStorage.getItem('dontShowWelcome');
    setShowWelcome(shouldShow);

    // Verify session on load
    const checkSession = async () => {
      try {
        const userData = await authHandler.verifySession();
        setUser(userData);
      } catch (error) {
        console.error('Session verification failed:', error);
      }
    };

    checkSession();
  }, []);

  const handleWelcomeClose = () => {
    setShowWelcome(false);
  };

  const handleLogout = async () => {
    try {
      await authHandler.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <ThemeProvider defaultTheme={THEME_MODES.DARK}>
      <Router>
        <AppRouter user={user} />
        {showWelcome && <WelcomeModal onClose={handleWelcomeClose} />}
      </Router>
    </ThemeProvider>
  );
} 