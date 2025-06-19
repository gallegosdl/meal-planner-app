import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

// Separate data display component
const DataDisplay = ({ data }) => {
  console.log('DataDisplay received:', data);
  
  if (!data) {
    console.log('DataDisplay: No data provided');
    return null;
  }

  if (!data.activities || data.activities.length === 0) {
    console.log('DataDisplay: No activities found');
    return (
      <div className="bg-[#1a1f2b] backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] shadow-xl text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg mb-1">
              <span className="text-[#FC4C02] font-semibold">Strava Connected</span> - {data.displayName}
            </h3>
            <p className="text-sm text-gray-400">Last synced: {new Date().toLocaleString()}</p>
          </div>
        </div>
        <p className="text-gray-400">No recent activities found</p>
      </div>
    );
  }

  console.log('DataDisplay rendering activities:', data.activities);
  return (
    <div className="bg-[#1a1f2b] backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] shadow-xl text-white">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg mb-1">
            <span className="text-[#FC4C02] font-semibold">Strava Connected</span> - {data.displayName}
          </h3>
          <p className="text-sm text-gray-400">Last synced: {new Date().toLocaleString()}</p>
        </div>
        <div className="flex items-start gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-400">Member Since</p>
            <p className="text-sm">{new Date(data.memberSince).toLocaleDateString()}</p>
          </div>
          <button 
            onClick={() => {
              const stravaComponent = document.querySelector('[data-testid="strava-login"]');
              if (stravaComponent) {
                stravaComponent.querySelector('button').click();
              }
            }} 
            className="p-2 hover:bg-[#ffffff0f] rounded-lg transition-colors group"
          >
            <svg className="w-5 h-5 text-[#FC4C02] group-hover:text-[#ff6934] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-base font-semibold mb-4">Recent Activities</h4>
        <div className="space-y-3">
          {data.activities.map((activity, index) => {
            console.log('Rendering activity:', activity);
            let activityIcon;
            if (activity.type === "Ride") {
              activityIcon = "/images/speed.png";
            } else if (activity.type === "Run") {
              activityIcon = "/images/walk.png";
            } else if (activity.type === "Rowing") {
              activityIcon = "/images/rowerWhite64.png";
            } else {
              activityIcon = "/images/workout.png";
            }

            return (
              <div key={index} className="bg-[#252B3B] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <img 
                      src={activityIcon}
                      alt={activity.name} 
                      className="w-6 h-6 mt-1"
                    />
                    <div>
                      <h5 className="font-medium mb-2">{activity.name}</h5>
                      <div className="text-sm text-gray-400">
                        {activity.distance && (
                          <p className="text-[#FC4C02]">
                            {(activity.distance / 1000).toFixed(2)} km
                          </p>
                        )}
                        <p>{Math.round(activity.moving_time / 60)} minutes</p>
                        {activity.total_elevation_gain && (
                          <p>{Math.round(activity.total_elevation_gain)} m elevation</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {new Date(activity.start_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function StravaLogin({ onDataReceived }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Common function to handle Strava data
  const handleStravaData = async (data) => {
    console.log('handleStravaData received:', data);
    try {
      const { profile, tokens, activities } = data;
      
      // Store tokens in session
      await axios.post('/api/strava/store-tokens', tokens, {
        withCredentials: true
      });
      
      // Call the callback with the data
      if (onDataReceived) {
        // Format the data for display
        const displayData = {
          displayName: `${profile.firstname} ${profile.lastname}`,
          memberSince: profile.created_at,
          activities: activities,
          id: profile.id
        };
        console.log('Calling onDataReceived with:', displayData);
        onDataReceived(displayData);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to store Strava tokens');
      console.error('Strava token storage error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth callback
  const handleOAuthCallback = async (event) => {
    console.log('Received message:', event);
    if (!event.data || event.data.type !== 'strava_callback') return;
    
    console.log('Processing Strava callback:', event.data);
    if (event.data.error) {
      setError(event.data.error);
      setLoading(false);
      return;
    }

    handleStravaData(event.data.data);
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

  // Only render the button
  return (
    <button 
      onClick={handleStravaLogin}
      disabled={loading}
      className="hidden"
      data-testid="strava-login-button"
    >
      {loading ? 'Connecting...' : 'Connect Strava'}
    </button>
  );
}

// Attach DataDisplay as a static property
StravaLogin.DataDisplay = DataDisplay;

export default StravaLogin;