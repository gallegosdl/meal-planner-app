//src/components/AppleAuthButton.jsx
import React from 'react';
import api from '../services/api';

const AppleAuthButton = ({ onSuccess, onError }) => {
  const handleAppleLogin = async () => {
    try {
      // Initialize Apple Sign-in
      const data = await window.AppleID.auth.signIn();
      
      try {
        // Send the authorization code to your backend
        const result = await api.post('/api/auth/apple', {
          code: data.authorization.code,
          id_token: data.authorization.id_token
        });

        if (result.status !== 200) {
          throw new Error('Authentication failed');
        }

        const userData = result.data;
        onSuccess(userData);
      } catch (error) {
        console.error('Login error:', error);
        onError(error);
      }
    } catch (error) {
      console.error('Apple OAuth error:', error);
      onError(error);
    }
  };

  return (
    <button
      onClick={handleAppleLogin}
      className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
      title="Sign in with Apple"
    >
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.569 12.6254C17.597 15.652 20.2179 16.6592 20.247 16.672C20.2239 16.7464 19.8502 18.0457 18.8962 19.3825C18.0697 20.5469 17.206 21.7057 15.8872 21.7338C14.5934 21.7613 14.1576 20.9511 12.6759 20.9511C11.1943 20.9511 10.7155 21.7057 9.48509 21.7613C8.21272 21.8169 7.21552 20.5193 6.38273 19.3605C4.68328 16.9757 3.41408 12.4763 5.17148 9.50635C6.04242 8.02492 7.57236 7.11172 9.2393 7.08368C10.4775 7.05621 11.6394 7.95137 12.3835 7.95137C13.1276 7.95137 14.5374 6.87408 16.0187 7.02012C16.7203 7.04759 18.5498 7.30119 19.7331 9.05187C19.6375 9.11107 17.5455 10.3036 17.569 12.6254ZM15.058 5.41697C15.7651 4.56975 16.2395 3.39443 16.1054 2.24707C15.1138 2.28947 13.8944 2.93392 13.1595 3.78113C12.5006 4.5341 11.9305 5.73695 12.0925 6.85725C13.1927 6.94391 14.3509 6.26362 15.058 5.41697Z"/>
      </svg>
    </button>
  );
};

export default AppleAuthButton; 