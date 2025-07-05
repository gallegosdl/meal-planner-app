// client/src/components/WelcomeModal.jsx
import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import SignupModal from './SignupModal';
import api, { setSession } from '../services/api';
import Privacy from '../pages/legal/Privacy';
import Terms from '../pages/legal/Terms';
import FacebookAuthButton from './FacebookAuthButton';
import XAuthButton from './XAuthButton';
//import AppleAuthButton from './AppleAuthButton';

const WelcomeModal = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Handle X OAuth redirect returns
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const xAuthSuccess = params.get('x_auth_success');
    const xAuthError = params.get('x_auth_error');

    if (xAuthSuccess === 'true') {
      // Get stored auth data
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
      } else {
        console.warn('⚠️ X OAuth success flag present but no auth data found');
        setError('Authentication incomplete. Please try again.');
      }
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
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
        // For X OAuth, we need to complete the token exchange
        setIsLoading(true);
        console.log('🔄 Completing X OAuth token exchange...');
        
        // This would typically involve calling your backend to complete the OAuth flow
        // For now, we'll simulate successful auth
        const result = await api.post('/api/auth/x/complete', {
          oauth_token: userData.oauth_token,
          oauth_verifier: userData.oauth_verifier
        });
        
        if (result.data?.sessionToken) {
          setSession(result.data.sessionToken);
          console.log('✅ X OAuth session token set:', result.data.sessionToken);
        }
        
        userData = result.data;
      }

      if (userData.sessionToken) {
        setSession(userData.sessionToken);
        console.log('Session token set after authentication:', userData.sessionToken);
      }
      
      if (dontShowAgain) {
        localStorage.setItem('dontShowWelcome', 'true');
      }
      onClose(dontShowAgain, userData);
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
        
        if (dontShowAgain) {
          localStorage.setItem('dontShowWelcome', 'true');
        }
        onClose(dontShowAgain, result.data);
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

  const handleManualSignup = async (userData) => {
    try {
      setIsLoading(true);
      // Here we'll add the API call to create user
      console.log('Manual signup:', userData);
      onClose(dontShowAgain);
    } catch (error) {
      throw new Error('Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="min-h-[calc(100vh-2rem)] md:min-h-0 w-full flex items-center justify-center py-8">
        <div className="bg-[#1a1f2b] rounded-2xl p-8 max-w-2xl w-full border border-[#ffffff1a] flex flex-col max-h-[90vh]">
          {/* Sticky Header */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-4 mb-6">
              <img 
                src="/images/NutriIQ-dark-preferred.png" 
                alt="Nutri IQ Logo" 
                className="w-16 h-16 rounded-xl"
              />
              <h2 className="text-2xl font-bold text-white">
                Welcome to <span className="text-white">Nutri </span><span className="text-blue-400">IQ</span>
              </h2>
            </div>

            {error && (
              <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <div className="space-y-4 text-gray-300 text-sm sm:text-base">
              <section>
                <h3 className="text-lg font-semibold text-white mb-2">
                  About <span className="text-white">Nutri </span><span className="text-blue-400">IQ</span>
                </h3>
                <p>
                  <span className="text-white">Nutri </span><span className="text-blue-400">IQ</span> is designed to help you achieve your health and dietary goals 
                  through personalized meal planning. Our AI-powered system takes into account your:
                </p>
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>Cuisine preferences</li>
                  <li>Dietary restrictions and goals</li>
                  <li>Favorite foods and ingredients</li>
                  <li>Foods you want to avoid</li>
                  <li>Budget constraints</li>
                  <li>Nutritional targets</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-white mb-2">Getting Started</h3>
                <div className="bg-[#1a1f2b] rounded-lg p-4 border border-[#ffffff1a] bg-[#151922]">
                  <p className="text-yellow-400 mb-2">⚠️ Important:</p>
                  <p>
                    To use <span className="text-white">Nutri </span><span className="text-blue-400">IQ</span>, you'll need to provide your OpenAI API key. 
                    This key allows our system to generate personalized meal plans using AI technology.
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-white mb-2">Key Features</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Personalized meal recommendations</li>
                  <li>Automatic grocery lists</li>
                  <li>Multiple view options (Calendar, Tiles, Detailed)</li>
                  <li>Store price comparisons</li>
                  <li>Recipe library</li>
                  <li>Instacart integration</li>
                </ul>
              </section>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex-shrink-0 mt-4 pt-4 border-t border-gray-700">
            {/* Legal Links Row */}
            <div className="flex gap-4 justify-center text-sm text-gray-400 mb-2">
              <button type="button" className="hover:text-blue-400 transition-colors underline" onClick={() => setShowPrivacy(true)}>Privacy Policy</button>
              <button type="button" className="hover:text-blue-400 transition-colors underline" onClick={() => setShowTerms(true)}>Terms of Service</button>
            </div>
            {/* Buttons Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <label className="flex items-center gap-2 text-gray-400 text-sm">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded bg-[#1a1f2b] border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                Don't show this again
              </label>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <button
                  onClick={() => onClose(dontShowAgain)}
                  className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg text-white font-medium hover:from-blue-600 hover:to-indigo-600 transition-colors"
                  disabled={isLoading}
                >
                  Continue as Guest
                </button>
                <div className="flex justify-center sm:justify-end gap-2">
                  {isLoading ? (
                    <div className="w-12 h-12 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => login()}
                        disabled={isLoading}
                        className="w-12 h-12 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                        title="Sign in with Google"
                      >
                        <svg className="w-6 h-6" viewBox="0 0 48 48">
                          <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                          <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                          <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                          <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                        </svg>
                      </button>
                      <div className="w-12 h-12">
                        <FacebookAuthButton
                          onSuccess={handleAuthSuccess}
                          onError={handleAuthError}
                        />
                      </div>
                      <div className="w-12 h-12">
                        {/*<AppleAuthButton
                          onSuccess={handleAuthSuccess}
                          onError={handleAuthError}
                        />*/}
                        <XAuthButton className="w-12 h-12"
                          onSuccess={handleAuthSuccess}
                          onError={handleAuthError}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#252B3B] rounded-2xl max-w-3xl w-full p-8 shadow-xl border border-[#ffffff1a] max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowPrivacy(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
            <Privacy />
          </div>
        </div>
      )}
      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#252B3B] rounded-2xl max-w-3xl w-full p-8 shadow-xl border border-[#ffffff1a] max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowTerms(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
            <Terms />
          </div>
        </div>
      )}

      {/* Signup Modal */}
      <SignupModal
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
        onSubmit={handleManualSignup}
      />
    </div>
  );
};

export default WelcomeModal; 