import React from 'react';
import api from '../services/api';

const XAuthButton = ({ onSuccess, onError }) => {
    const handleXLogin = async () => {
        try {
          // Get the authorization URL from our backend
          const response = await fetch('http://localhost:3001/api/auth/x/authorize', {
            credentials: 'include',
            headers: {
              'Accept': 'application/json'
            }
          });
      
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to get auth URL:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            });
            throw new Error(`Failed to get authorization URL: ${response.status} ${response.statusText}`);
          }
      
          const data = await response.json();
          if (!data.url) {
            throw new Error('No authorization URL received from server');
          }
      
          // Open the popup
          const width = 600;
          const height = 600;
          const left = window.innerWidth / 2 - width / 2;
          const top = window.innerHeight / 2 - height / 2;
          const popup = window.open(
            data.url,
            'xAuth',
            `width=${width},height=${height},left=${left},top=${top}`
          );
      
          if (!popup) {
            throw new Error('Failed to open popup window. Please allow popups for this site.');
          }
      
          // Listen for auth success message
          const messageHandler = (event) => {
            if (event.data?.type === 'X_AUTH_SUCCESS') {
              console.log('✅ X OAuth success:', event.data);
              window.removeEventListener('message', messageHandler);
              if (!popup.closed) popup.close();
              onSuccess(event.data.user);
            } else if (event.data?.type === 'X_AUTH_ERROR') {
              console.log('❌ X OAuth error:', event.data);
              window.removeEventListener('message', messageHandler);
              if (!popup.closed) popup.close();
              onError(new Error(event.data.error || 'Authentication failed'));
            }
          };
      
          window.addEventListener('message', messageHandler);
      
        } catch (error) {
          console.error('Error initiating X auth:', error);
          onError(error);
        }
      };

  return (
    <button
      onClick={handleXLogin}
      className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
      title="Sign in with X"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        />
      </svg>
    </button>
  );
};

export default XAuthButton;