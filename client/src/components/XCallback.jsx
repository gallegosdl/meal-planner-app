// client/src/components/XCallback.jsx
import React, { useEffect } from 'react';

const XCallback = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth_token = params.get('oauth_token');
    const oauth_verifier = params.get('oauth_verifier');
    const error = params.get('error');

    // Check if this is a redirect-based auth return
    const isRedirectAuth = sessionStorage.getItem('x_auth_redirect') === 'true';
    const originUrl = sessionStorage.getItem('x_auth_origin');

    if (error) {
      console.error('OAuth error:', error);
      
      if (isRedirectAuth && originUrl) {
        // Clear redirect markers
        sessionStorage.removeItem('x_auth_redirect');
        sessionStorage.removeItem('x_auth_origin');
        
        // Redirect back to origin with error
        window.location.href = `${originUrl}?x_auth_error=${encodeURIComponent(error)}`;
        return;
      } else if (window.opener) {
        // Send error to popup opener
        window.opener.postMessage({
          type: 'X_AUTH_ERROR',
          error: error
        }, window.location.origin);
        window.close();
        return;
      }
    }

    if (oauth_token && oauth_verifier) {
      if (isRedirectAuth && originUrl) {
        // Clear redirect markers
        sessionStorage.removeItem('x_auth_redirect');
        sessionStorage.removeItem('x_auth_origin');
        
        // Store auth success data temporarily
        sessionStorage.setItem('x_auth_success', JSON.stringify({
          oauth_token,
          oauth_verifier,
          timestamp: Date.now()
        }));
        
        // Redirect back to origin
        window.location.href = `${originUrl}?x_auth_success=true`;
        return;
      } else if (window.opener) {
        // Send message to popup opener
        window.opener.postMessage({
          type: 'x-auth-success',
          oauth_token,
          oauth_verifier
        }, window.location.origin);
        window.close();
        return;
      }
    }

    // If we get here, something went wrong
    console.error('OAuth callback: No valid auth data or context');
    
    // Fallback: redirect to home
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
    
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-white text-center max-w-md">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="mb-2">Completing X authentication...</p>
        <p className="text-sm text-gray-400">
          If this takes too long, you may need to allow popups or try again.
        </p>
      </div>
    </div>
  );
};

export default XCallback; 