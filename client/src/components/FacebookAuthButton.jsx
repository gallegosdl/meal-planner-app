import React from 'react';
import FacebookLogin from '@greatsumini/react-facebook-login';
import api from '../services/api';

const FacebookAuthButton = ({ onSuccess, onError }) => {
  const handleFacebookResponse = async (response) => {
    try {
      if (response.accessToken) {
        // Send the access token to your backend
        const result = await api.post('/api/auth/facebook', {
          access_token: response.accessToken
        });

        if (result.status !== 200) {
          throw new Error('Authentication failed');
        }

        onSuccess(result.data);
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      onError(error);
    }
  };

  return (
    <FacebookLogin
      appId="1021280096454201" // Hardcoding for now to debug
      onSuccess={handleFacebookResponse}
      onFail={(error) => {
        console.error('Facebook OAuth error:', error);
        onError(error);
      }}
      scope="public_profile,email"
      render={({ onClick }) => (
        <button
          onClick={onClick}
          type="button"
          className="w-full h-full bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] transition-colors flex items-center justify-center"
          title="Sign in with Facebook"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </button>
      )}
    />
  );
};

export default FacebookAuthButton; 