// client/src/components/AuthModal.jsx

import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import api, { setSession } from '../services/api';
import FacebookAuthButton from './FacebookAuthButton';
import XAuthButton from './XAuthButton';

const AuthModal = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle X OAuth redirect returns
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const xAuthSuccess = params.get('x_auth_success');
    const xAuthError = params.get('x_auth_error');

    if (xAuthSuccess === 'true') {
      const authDataStr = sessionStorage.getItem('x_auth_success');
      if (authDataStr) {
        try {
          const authData = JSON.parse(authDataStr);
          
          // Check if data is fresh (within 5 minutes)
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          if (authData.timestamp > fiveMinutesAgo) {
            console.log('✅ Processing X OAuth redirect success');
            
            // Clear the data
            sessionStorage.removeItem('x_auth_success');
            
            // Clean up URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            
            // Handle the auth success as if it came from popup
            handleAuthSuccess({
              provider: 'x',
              oauth_token: authData.oauth_token,
              oauth_verifier: authData.oauth_verifier
            });
          } else {
            console.warn('⚠️ X OAuth data expired');
            sessionStorage.removeItem('x_auth_success');
            setError('Authentication session expired. Please try again.');
          }
        } catch (err) {
          console.error('❌ Error parsing X auth data:', err);
          sessionStorage.removeItem('x_auth_success');
          setError('Authentication data corrupted. Please try again.');
        }
      }
    } else if (xAuthError) {
      console.error('❌ X OAuth redirect error:', xAuthError);
      setError(`X authentication failed: ${decodeURIComponent(xAuthError)}`);
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  const handleAuthSuccess = async (userData) => {
    try {
      // Handle different auth providers
      if (userData.provider === 'x') {
        setIsLoading(true);
        console.log('🔄 Completing X OAuth token exchange...');
        
        const result = await api.post('/api/auth/x/complete', {
          oauth_token: userData.oauth_token,
          oauth_verifier: userData.oauth_verifier
        });

        console.log('🔥 X login backend result:', result.data.userData);
        
        if (result.data?.sessionToken) {
            setSession(result.data.sessionToken);
            console.log('✅ X OAuth session token set:', result.data.sessionToken);
          }
          
          console.log('🔥 X login backend result:', result.data);
          userData = {
            ...result.data.user,             
            sessionToken: result.data.sessionToken
          };
      }

      if (userData.sessionToken) {
        setSession(userData.sessionToken);
        console.log('Session token set after authentication:', userData.sessionToken);
      }
      
      onClose(userData);
    } catch (error) {
      console.error('Authentication success handling error:', error);
      setError(error.message || 'Failed to process authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (error) => {
    console.error('Authentication error:', error);
    setError(error.message || 'Failed to authenticate. Please try again.');
    setIsLoading(false);
  };

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        setIsLoading(true);
        setError(null);

        // Store the access token in session storage
        sessionStorage.setItem('google_access_token', response.access_token);

        // Send the credential to your backend
        const result = await api.post('/api/auth/google', {
          credential: response.access_token
        });

        if (result.data?.sessionToken) {
          setSession(result.data.sessionToken);
          console.log('Session token set after authentication:', result.data.sessionToken);
        }
        
        onClose(result.data);
      } catch (error) {
        console.error('Login error:', error);
        setError('Failed to authenticate with Google');
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google OAuth error:', error);
      setError('Failed to authenticate with Google');
      setIsLoading(false);
    },
    scope: 'openid email profile',
    flow: 'implicit'
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="relative bg-[#1a1f2b] rounded-2xl p-6 max-w-md w-full border border-[#ffffff1a]">

        {/* Close button absolutely positioned INSIDE the card */}
        <button 
            onClick={() => onClose()} 
            className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl"
            aria-label="Close"
        >
            ×
        </button>

        <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white">
            Sign in to <span className="text-blue-400">Nutri IQ</span>
            </h2>
            <p className="text-gray-400 mt-1">
            Choose a sign-in option below
            </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <button
                onClick={() => login()}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-2 px-4 rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition-colors"
                title="Sign in with Google"
                >
                <svg className="w-6 h-6" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                </button>
                <FacebookAuthButton
                    onSuccess={handleAuthSuccess}
                    onError={handleAuthError}
                    className="py-2 px-4"
                >
                </FacebookAuthButton>

                {/*<AppleAuthButton
                    onSuccess={handleAuthSuccess}
                    onError={handleAuthError}
                />*/}
                <XAuthButton
                    onSuccess={handleAuthSuccess}
                    onError={handleAuthError}
                    className="w-full flex items-center justify-center gap-3 py-2 px-4 rounded-lg bg-black text-white hover:bg-gray-900 transition-colors"
                />

            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal; 