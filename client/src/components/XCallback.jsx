import React, { useEffect } from 'react';

const XCallback = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth_token = params.get('oauth_token');
    const oauth_verifier = params.get('oauth_verifier');

    if (oauth_token && oauth_verifier) {
      // Send message to parent window
      window.opener.postMessage({
        type: 'x-auth-success',
        oauth_token,
        oauth_verifier
      }, window.location.origin);
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  );
};

export default XCallback; 