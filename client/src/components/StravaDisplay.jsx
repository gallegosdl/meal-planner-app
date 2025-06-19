import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

const StravaDisplay = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Function to handle messages from popup window
  const handleOAuthCallback = async (event) => {
    if (!event.data || event.data.type !== 'strava_callback') return;
    
    if (event.data.error) {
      setError(event.data.error);
      setLoading(false);
      return;
    }

    handleStravaData(event.data.data);
  };

  // Common function to handle Strava data
  const handleStravaData = async (responseData) => {
    try {
      const { profile, tokens, activities } = responseData;
      
      // Store tokens in session
      await axios.post('/api/strava/store-tokens', tokens, {
        withCredentials: true
      });
      
      // Format the data for display
      setData({
        displayName: `${profile.firstname} ${profile.lastname}`,
        memberSince: profile.created_at,
        activities: activities,
        id: profile.id
      });
      setError(null);
    } catch (err) {
      setError('Failed to store Strava tokens');
      console.error('Strava token storage error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add message listener for popup callback
    window.addEventListener('message', handleOAuthCallback);
    return () => window.removeEventListener('message', handleOAuthCallback);
  }, []);

  const handleStravaLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth URL from backend
      const response = await axios.get('/api/strava/auth', { 
        withCredentials: true
      });

      // Try popup first
      const width = 600;
      const height = 800;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        response.data.authUrl,
        'Strava Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // If popup blocked, fallback to redirect
      if (!popup) {
        window.location.href = response.data.authUrl;
        return;
      }

    } catch (err) {
      setError('Failed to initialize Strava authentication');
      console.error('Strava auth error:', err);
      setLoading(false);
    }
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
          onClick={handleStravaLogin}
          disabled={loading}
          className="flex items-center gap-2 bg-[#FC4C02] hover:bg-[#ff6934] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {loading ? 'Connecting...' : 'Connect Strava'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full flex flex-col">
      <div className="text-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              <span className="text-[#FC4C02]">Strava Connected</span> - <span className="text-white font-normal">{data.displayName}</span>
            </h3>
            <p className="text-sm text-gray-400">Last synced: {new Date().toLocaleString()}</p>
          </div>
          <div className="flex items-end gap-6">
            <div className="text-right">
              <p className="text-sm text-gray-400">Member Since</p>
              <p className="text-base">{new Date(data.memberSince).toLocaleDateString()}</p>
            </div>
            <button 
              onClick={handleStravaLogin}
              className="self-start mt-[8px] text-[#FC4C02] hover:text-[#ff6934] transition-colors"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mt-3 pt-4 border-t border-[#ffffff1a]">
          <h4 className="text-lg font-semibold mb-4">Recent Activities</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.activities.map((activity, index) => {
              const isRowing = activity.type === "Rowing";
              return (
                <div 
                  key={index}
                  className={`bg-[#ffffff0a] rounded-lg p-4 flex flex-col ${
                    isRowing ? 'sm:col-span-2 lg:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={isRowing ? "/images/rowerWhite64.png" : "/images/workout.png"}
                        alt={activity.type}
                        className={`${isRowing ? 'w-12 h-12' : 'w-8 h-8'}`}
                      />
                      <h5 className={`${isRowing ? 'text-xl' : 'text-lg'} font-medium`}>{activity.name}</h5>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-400">
                    {activity.distance && (
                      <p className="text-[#FC4C02] font-medium">
                        {(activity.distance / 1000).toFixed(2)} km
                      </p>
                    )}
                    <p>{Math.round(activity.moving_time / 60)} minutes</p>
                    <p className="text-xs">{new Date(activity.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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

export default StravaDisplay; 