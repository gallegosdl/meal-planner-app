import React, { useState } from 'react';
import FacebookLogin from '@greatsumini/react-facebook-login';
import api from '../services/api';

const FacebookAuthButton = ({ onSuccess, onError, children, className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFacebookResponse = async (response) => {
    try {
      setIsLoading(true);

      if (!response) {
        throw new Error('No response from Facebook');
      }

      if (response.error) {
        throw new Error(response.error.message || 'Facebook authentication failed');
      }

      if (!response.accessToken) {
        throw new Error('No access token received from Facebook');
      }

      // Send the access token to your backend
      const result = await api.post('/api/auth/facebook', {
        access_token: response.accessToken
      });

      if (result.data && result.data.error) {
        throw new Error(result.data.error);
      }

      onSuccess(result.data);
    } catch (error) {
      console.error('Facebook login error:', error);
      onError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FacebookLogin
      appId={process.env.REACT_APP_FACEBOOK_APP_ID}
      onSuccess={handleFacebookResponse}
      onFail={(error) => {
        console.error('Facebook OAuth error:', error);
        setIsLoading(false);
        onError(error.message || 'Facebook authentication failed');
      }}
      scope="public_profile,email"
      onProfileSuccess={(response) => {
        console.log('Profile data received:', {
          id: response.id,
          hasEmail: !!response.email,
          name: response.name
        });
      }}
      render={({ onClick }) => (
        <button
          onClick={onClick}
          type="button"
          disabled={isLoading}
          className={`flex items-center justify-center gap-3 w-full h-full rounded-lg bg-[#1877F2] text-white hover:bg-[#166FE5] transition-colors ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          } ${className}`}
          title="Sign in with Facebook"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              {children}
            </>
          )}
        </button>
      )}
    />
  );
};

export default FacebookAuthButton;
