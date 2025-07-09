// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { THEME_MODES } from './styles/themes';
import AppRouter from './routes/AppRouter';
import { authHandler } from './handlers/authHandler';
import WelcomeModal from './components/WelcomeModal';
import { Toaster, toast } from 'react-hot-toast';

function AppContent() {
  const { currentTheme } = useTheme();

  const [user, setUser] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);

  /** Check local storage and session on mount **/
  useEffect(() => {
    console.log('[App useEffect - mount] checking localStorage');
    const shouldShow = !localStorage.getItem('dontShowWelcome');
    console.log('[App useEffect - mount] shouldShowWelcome:', shouldShow);
    setShowWelcome(shouldShow);

    console.log('[App useEffect - mount] calling checkSession()');
    checkSession();
  }, []);

  /** Async session verifier **/
  const checkSession = async () => {
    console.log('[App checkSession] CALLED');
    try {
      const userData = await authHandler.verifySession();
      console.log('[App checkSession] RESULT:', userData);
      if (userData) {
        setUser({ ...userData, guest: false });
      } else {
        console.log('[App checkSession] No userData returned');
      }
    } catch (error) {
      console.error('[App checkSession] ERROR:', error);
    }
  };

  /** Whenever user changes **/
  useEffect(() => {
    console.log('[App useEffect - user changed]', user);
    if (user === null) {
      console.log('[App useEffect - user is null]');
    } else {
      console.log('[App useEffect - user object]:', JSON.stringify(user, null, 2));
    }
  }, [user]);

  /** Close welcome modal **/
  const handleWelcomeClose = (dontShowAgain, userData) => {
    console.log('[App handleWelcomeClose] dontShowAgain:', dontShowAgain);
    console.log('[App handleWelcomeClose] userData:', userData);
    if (dontShowAgain) {
      localStorage.setItem('dontShowWelcome', 'true');
    }
    if (userData) {
      setUser(userData);
    }
    setShowWelcome(false);
  };

  /** Logout handler with toast **/
  const handleLogout = async () => {
    console.log('[App handleLogout] CALLED');
    try {
      toast.loading('Logging out...', { id: 'logout' });
      await authHandler.logout();
      setUser(null);
      toast.success('Logged out successfully!', { id: 'logout' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('[App handleLogout] ERROR:', error);
      toast.error('Logout failed - session cleared locally', { id: 'logout' });
      setUser(null);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className={`min-h-screen ${currentTheme.backgrounds.app} ${currentTheme.text.primary}`}>
      <Router>
        <AppRouter
          user={user}
          setUser={setUser}
          handleLogout={handleLogout}
        />
        {showWelcome && (
          <WelcomeModal onClose={handleWelcomeClose} />
        )}
        <Toaster position="top-right" />
      </Router>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme={THEME_MODES.DARK}>
      <AppContent />
    </ThemeProvider>
  );
}
