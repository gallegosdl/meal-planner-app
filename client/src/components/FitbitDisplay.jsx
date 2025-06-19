import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

const FitbitDisplay = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle redirect flow
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const responseData = params.get('data');
    const errorMessage = params.get('message');

    if (responseData) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(responseData));
        handleFitbitData(parsedData);
        navigate(location.pathname, { replace: true });
      } catch (err) {
        console.error('Failed to parse Fitbit data:', err);
        setError('Failed to process Fitbit data');
      }
    } else if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  // Function to handle messages from popup window
  const handleOAuthCallback = async (event) => {
    if (!event.data || event.data.type !== 'fitbit_callback') return;
    
    if (event.data.error) {
      setError(event.data.error);
      setLoading(false);
      return;
    }

    handleFitbitData(event.data.data);
  };

  // Common function to handle Fitbit data
  const handleFitbitData = async (responseData) => {
    try {
      const { profile, tokens, allData } = responseData;
      
      // Store tokens in session
      await axios.post('/api/fitbit/store-tokens', tokens, {
        withCredentials: true
      });
      
      setData({ ...profile, allData });
      setError(null);
    } catch (err) {
      setError('Failed to store Fitbit tokens');
      console.error('Fitbit token storage error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add message listener for popup callback
    window.addEventListener('message', handleOAuthCallback);
    return () => window.removeEventListener('message', handleOAuthCallback);
  }, []);

  const handleFitbitLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth URL from backend
      const response = await axios.get('/api/fitbit/auth', { 
        withCredentials: true
      });

      // Try popup first
      const width = 600;
      const height = 800;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        response.data.authUrl,
        'Fitbit Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // If popup blocked, fallback to redirect
      if (!popup) {
        window.location.href = response.data.authUrl;
        return;
      }

    } catch (err) {
      setError('Failed to initialize Fitbit authentication');
      console.error('Fitbit auth error:', err);
      setLoading(false);
    }
  };

  // Add height conversion function
  const formatHeight = (heightCm) => {
    if (!heightCm) return null;
    const totalInches = Math.round(heightCm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${feet}'${inches}"`;
  };

  if (!data) {
    return (
      <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full flex flex-col justify-center items-center">
        {error && (
          <div className="text-red-400 text-center mb-4">
            <p>{error}</p>
          </div>
        )}
        <button 
          onClick={handleFitbitLogin}
          disabled={loading}
          className="bg-[#00B0B9] text-white px-6 py-3 rounded-lg hover:bg-[#00919A] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
            </svg>
          )}
          {loading ? 'Connecting...' : 'Connect Fitbit'}
        </button>
      </div>
    );
  }

  const height = formatHeight(data.height);
  
  return (
    <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full flex flex-col">
      <div className="text-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              <span className="text-green-400">Fitbit Connected</span> - <span className="text-white font-normal">{data.displayName || data.fullName}</span>
              {data.age && <span className="text-white font-normal"> ({data.age} years)</span>}
            </h3>
            <p className="text-sm text-gray-400">Last synced: {new Date().toLocaleString()}</p>
          </div>
          <div className="flex items-end gap-6">
            <div className="text-right">
              <p className="text-sm text-gray-400">Member Since</p>
              <p className="text-base">{new Date(data.memberSince).toLocaleDateString()}</p>
            </div>
            <button 
              onClick={handleFitbitLogin}
              className="self-start mt-[8px] text-green-400 hover:text-green-300 transition-colors"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Top Section - Single Column */}
        <div className="mb-3">
          {data.allData?.activities?.daily?.summary?.steps && (
            <div>
              <p className="text-sm text-gray-400">Today's Steps</p>
              <p className="text-xl">{Number(data.allData.activities.daily.summary.steps).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Bottom Section - Daily Activities */}
        <div className="mt-3 pt-4 border-t border-[#ffffff1a]">
          <h4 className="text-lg font-semibold mb-4">Today's Activities</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.allData?.activities?.daily?.activities?.map((activity, index) => {
              if (!activity) return null;

              // Determine which icon to show
              let iconPath = null;
              const isRowing = activity.name?.toLowerCase().includes('rowing');
              if (isRowing) {
                iconPath = "/images/rowerWhite64.png";
              } else if (activity.activityParentName === "Run" || activity.name?.toLowerCase().includes('run')) {
                iconPath = "/images/speed.png";
              } else if (activity.activityParentName === "Walk" || activity.name?.toLowerCase().includes('walk')) {
                iconPath = "/images/walking.png";
              }

              return (
                <div 
                  key={index} 
                  className={`bg-[#ffffff0a] rounded-lg p-4 flex flex-col ${
                    isRowing ? 'sm:col-span-2 lg:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {iconPath && (
                        <img 
                          src={iconPath}
                          alt={activity.name}
                          className={`${isRowing ? 'w-12 h-12' : 'w-8 h-8'}`}
                        />
                      )}
                      <h5 className={`${isRowing ? 'text-xl' : 'text-lg'} font-medium`}>{activity.name}</h5>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-400">
                    {activity.distance && (
                      <p className="text-green-400 font-medium">
                        {(activity.distance).toFixed(2)} miles
                      </p>
                    )}
                    <p>{activity.calories} Calories</p>
                    <p>{Math.round(activity.duration / 60000)} minutes</p>
                    <p className="text-xs">{activity.startTime || 'No time available'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FitbitDisplay; 