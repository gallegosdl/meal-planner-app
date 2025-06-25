import React from 'react';
import { authenticate, clearSession } from '../services/api';
import { toast } from 'react-hot-toast';

const ApiKeyInput = () => {
  const [apiKey, setApiKey] = React.useState(localStorage.getItem('openai_api_key') || '');
  const [error, setError] = React.useState(null);
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);

  const handleApiKeyChange = async (value) => {
    setApiKey(value);
    setError(null); // Reset error state on new attempt
    
    if (value) {
      setIsAuthenticating(true); // Show loading state
      try {
        // Attempt to authenticate with the API key
        await authenticate(value);
        localStorage.setItem('openai_api_key', value);
        toast.success('API key validated successfully');
        
      } catch (error) {
        // Handle different error scenarios with specific messages
        let errorMessage;
        if (error.response?.status === 401) {
          errorMessage = 'Invalid API key. Please check your key and try again.';
        } else if (error.response?.status === 429) {
          errorMessage = 'Too many attempts. Please wait a moment and try again.';
        } else {
          errorMessage = 'Failed to validate API key. Please try again later.';
        }
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Authentication error:', error);
        localStorage.removeItem('openai_api_key');
      } finally {
        setIsAuthenticating(false);
      }
    } else {
      // If value is empty, clear everything
      localStorage.removeItem('openai_api_key');
      clearSession();
    }
  };

  return (
    <div className="col-span-1 sm:col-span-6 lg:col-span-12 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)] mb-8">
    {/*<div className="col-span-1 sm:col-span-6 lg:col-span-12 bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] mb-8">*/}
      <h3 className="text-sm text-gray-400 mb-4">OpenAI API Key</h3>
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="Enter your OpenAI API key"
            className={`flex-1 px-4 py-2 bg-[#2A3142] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
              error ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
            }`}
            disabled={isAuthenticating}
          />
          <button
            onClick={() => handleApiKeyChange('')}
            className="px-4 py-2 bg-[#2A3142] text-gray-400 rounded-lg hover:bg-[#313748]"
            disabled={isAuthenticating}
          >
            Clear
          </button>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Loading state */}
        {isAuthenticating && (
          <div className="text-sm text-blue-400 bg-blue-400/10 p-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Validating API key...
          </div>
        )}

        <p className="text-xs text-gray-500">
          Your API key is stored locally and never sent to our servers
        </p>
      </div>
    </div>
  );
};

export default ApiKeyInput; 