import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import SignupModal from './SignupModal';
import api from '../services/api';
import Privacy from '../pages/legal/Privacy';
import Terms from '../pages/legal/Terms';

const WelcomeModal = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        setIsLoading(true);
        setError(null);

        // Send the credential to your backend
        const result = await api.post('/api/auth/google', {
          credential: response.access_token
        });

        if (result.status !== 200) {
          const errorData = result.data;
          console.error('Server auth error:', errorData);
          throw new Error(errorData.error || 'Authentication failed');
        }

        const userData = result.data;
        console.log('Login successful:', userData);
        
        if (dontShowAgain) {
          localStorage.setItem('dontShowWelcome', 'true');
        }
        onClose(dontShowAgain, userData);
      } catch (error) {
        console.error('Login error:', error);
        setError(error.message || 'Failed to authenticate. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google OAuth error:', error);
      setError('Failed to connect to Google. Please try again.');
      setIsLoading(false);
    },
    scope: 'openid email',
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
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#252B3B] rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#ffffff1a] max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Welcome to Meal Planner AI
            </h2>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">
              Your personal AI-powered nutrition assistant
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Scrollable Content */}
          <div className="space-y-4 text-gray-300 overflow-y-auto flex-1 text-sm sm:text-base">
            <section>
              <h3 className="text-lg font-semibold text-white mb-2">About Meal Planner</h3>
              <p>
                Meal Planner AI is designed to help you achieve your health and dietary goals 
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
              <div className="bg-[#1a1f2b] rounded-lg p-4">
                <p className="text-yellow-400 mb-2">⚠️ Important:</p>
                <p>
                  To use Meal Planner AI, you'll need to provide your OpenAI API key. 
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

          {/* Footer - Fixed at bottom */}
          <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col gap-2">
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
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onClose(dontShowAgain)}
                  className="flex-1 sm:flex-none px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg text-white font-medium hover:from-blue-600 hover:to-indigo-600 transition-colors"
                  disabled={isLoading}
                >
                  Continue as Guest
                </button>
                <button
                  onClick={() => login()}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none px-6 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
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
    </>
  );
};

export default WelcomeModal; 