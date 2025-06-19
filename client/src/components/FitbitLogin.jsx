import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

function FitbitLogin({ onDataReceived }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle redirect flow
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const data = params.get('data');
    const errorMessage = params.get('message');

    if (data) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(data));
        handleFitbitData(parsedData);
        // Clear URL params
        navigate(location.pathname, { replace: true });
      } catch (err) {
        console.error('Failed to parse Fitbit data:', err);
        setError('Failed to process Fitbit data');
      }
    } else if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  // Function to handle messages from popup window
  const handleOAuthCallback = async (event) => {
    if (!event.data || event.data.type !== 'fitbit_callback') return;
    
    if (event.data.error) {
      setError(event.data.error);
      setLoading(false);
      return;
    }

    handleFitbitData(event.data.data);
  };

  // Common function to handle Fitbit data
  const handleFitbitData = async (data) => {
    try {
      const { profile, tokens, allData } = data;
      
      // Store tokens in session
      await axios.post('/api/fitbit/store-tokens', tokens, {
        withCredentials: true
      });
      
      if (onDataReceived) {
        onDataReceived({ ...profile, allData });
      }
      setError(null);
    } catch (err) {
      setError('Failed to store Fitbit tokens');
      console.error('Fitbit token storage error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add message listener for popup callback
    window.addEventListener('message', handleOAuthCallback);
    return () => window.removeEventListener('message', handleOAuthCallback);
  }, []);

  const handleFitbitLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth URL from backend
      const response = await axios.get('/api/fitbit/auth', { 
        withCredentials: true
      });

      // Try popup first
      const width = 600;
      const height = 800;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        response.data.authUrl,
        'Fitbit Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // If popup blocked, fallback to redirect
      if (!popup) {
        window.location.href = response.data.authUrl;
        return;
      }

    } catch (err) {
      setError('Failed to initialize Fitbit authentication');
      console.error('Fitbit auth error:', err);
      setLoading(false);
    }
  };

  // Only render the button
  return (
    <button 
      onClick={handleFitbitLogin}
      disabled={loading}
      className="hidden"
      data-testid="fitbit-login-button"
    >
      {loading ? 'Connecting...' : 'Connect Fitbit'}
    </button>
  );
}

export default FitbitLogin; 