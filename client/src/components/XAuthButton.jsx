// client/src/components/XAuthButton.jsx
import React, { useState } from 'react';
import api from '../services/api';

const XAuthButton = ({ onSuccess, onError }) => {
    const [showPopupHelp, setShowPopupHelp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Detect if popups are likely blocked
    const detectPopupBlocker = () => {
      try {
        const testPopup = window.open('', 'test', 'width=1,height=1');
        if (!testPopup || testPopup.closed || typeof testPopup.closed === 'undefined') {
          return true; // Popup blocked
        }
        testPopup.close();
        return false; // Popup allowed
      } catch (error) {
        return true; // Popup blocked
      }
    };

    // Enhanced popup opening with better detection
    const openAuthPopup = (url) => {
      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;
      
      const popup = window.open(
        url,
        'xAuth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,status=yes,location=yes`
      );

      // Enhanced popup detection
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        return null; // Definitely blocked
      }

      // Additional check after a brief delay
      setTimeout(() => {
        if (popup.closed) {
          console.warn('Popup was closed immediately - likely blocked');
        }
      }, 100);

      return popup;
    };

    // Fallback to redirect-based auth
    const handleRedirectAuth = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/api/auth/x/authorize');
        const data = response.data;
        
        if (!data.url) {
          throw new Error('No authorization URL received from server');
        }

        // Store callback info in sessionStorage for redirect return
        sessionStorage.setItem('x_auth_redirect', 'true');
        sessionStorage.setItem('x_auth_origin', window.location.href);
        
        // Redirect to X OAuth
        window.location.href = data.url;
      } catch (error) {
        setIsLoading(false);
        console.error('Error with redirect auth:', error);
        onError(error);
      }
    };

    const handleXLogin = async () => {
        try {
          setIsLoading(true);
          
          // First, check if popups are likely blocked
          if (detectPopupBlocker()) {
            setIsLoading(false);
            setShowPopupHelp(true);
            return;
          }

          // Get the authorization URL from our backend
          const response = await api.get('/api/auth/x/authorize');
          const data = response.data;
          if (!data.url) {
            throw new Error('No authorization URL received from server');
          }
      
          // Try to open the popup with enhanced detection
          const popup = openAuthPopup(data.url);
      
          if (!popup) {
            setIsLoading(false);
            setShowPopupHelp(true);
            return;
          }

          // Monitor popup status
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              window.removeEventListener('message', messageHandler);
              setIsLoading(false);
            }
          }, 1000);
      
          // Listen for auth success message
          const messageHandler = (event) => {
            // Verify origin for security
            const allowedOrigins = [
              window.location.origin,
              process.env.NODE_ENV === 'production' 
                ? 'https://meal-planner-app-3m20.onrender.com'
                : 'http://localhost:3001'
            ];
            
            if (!allowedOrigins.includes(event.origin)) {
              console.warn('Ignoring message from unknown origin:', event.origin);
              return;
            }

            if (event.data?.type === 'X_AUTH_SUCCESS') {
              console.log('✅ X OAuth success:', event.data);
              clearInterval(checkClosed);
              window.removeEventListener('message', messageHandler);
              if (!popup.closed) popup.close();
              setIsLoading(false);
              onSuccess(event.data.user);
            } else if (event.data?.type === 'X_AUTH_ERROR') {
              console.log('❌ X OAuth error:', event.data);
              clearInterval(checkClosed);
              window.removeEventListener('message', messageHandler);
              if (!popup.closed) popup.close();
              setIsLoading(false);
              onError(new Error(event.data.error || 'Authentication failed'));
            }
          };
      
          window.addEventListener('message', messageHandler);

          // Timeout after 5 minutes
          setTimeout(() => {
            if (!popup.closed) {
              popup.close();
            }
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            setIsLoading(false);
          }, 5 * 60 * 1000);
      
        } catch (error) {
          setIsLoading(false);
          console.error('Error initiating X auth:', error);
          onError(error);
        }
      };

  return (
    <>
      <button
        onClick={handleXLogin}
        disabled={isLoading}
        className={`flex items-center justify-center w-12 h-12 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="Sign in with X"
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
            />
          </svg>
        )}
      </button>

      {/* Popup Help Modal */}
      {showPopupHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="bg-yellow-100 rounded-full p-2 mr-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Popup Blocked
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Your browser is blocking popups. Choose an option to continue with X authentication:
              </p>
              
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-1">Option 1: Allow Popups</h4>
                  <p className="text-sm text-blue-700">
                    Click the popup icon 🚫 in your address bar and select "Always allow popups from this site"
                  </p>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-1">Option 2: Use Redirect</h4>
                  <p className="text-sm text-green-700">
                    Continue with a redirect-based login (you'll be taken to X and brought back)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPopupHelp(false);
                  handleXLogin(); // Try popup again
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Popup Again
              </button>
              
              <button
                onClick={() => {
                  setShowPopupHelp(false);
                  handleRedirectAuth();
                }}
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Redirecting...' : 'Use Redirect'}
              </button>
            </div>

            <button
              onClick={() => setShowPopupHelp(false)}
              className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default XAuthButton;