import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

const StravaDisplay = ({ onCaloriesUpdate }) => {
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

    console.log('Checking URL params:', { responseData, errorMessage });

    if (responseData) {
      try {
        console.log('Parsing response data from URL');
        const parsedData = JSON.parse(decodeURIComponent(responseData));
        console.log('Successfully parsed data:', parsedData);
        handleStravaData(parsedData);
        navigate(location.pathname, { replace: true });
      } catch (err) {
        console.error('Failed to parse Strava data:', err);
        setError('Failed to process Strava data');
      }
    } else if (errorMessage) {
      console.log('Found error message in URL:', errorMessage);
      setError(decodeURIComponent(errorMessage));
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  // Function to handle messages from popup window
  const handleOAuthCallback = async (event) => {
    console.log('Received postMessage event:', event.data?.type);
    if (!event.data || event.data.type !== 'strava_callback') return;
    
    if (event.data.error) {
      console.error('Strava OAuth error:', event.data.error);
      setError(event.data.error);
      setLoading(false);
      return;
    }

    console.log('Received Strava callback data:', {
      hasProfile: !!event.data.data?.profile,
      hasTokens: !!event.data.data?.tokens,
      activitiesCount: event.data.data?.activities?.length
    });

    handleStravaData(event.data.data);
  };

  const handleStravaData = async (responseData) => {
    try {
      console.log('handleStravaData called with:', responseData);
      const { profile, tokens, activities, dailyCalories } = responseData;
      
      // Store tokens in session
      console.log('Storing Strava tokens...');
      await api.post('/api/strava/store-tokens', tokens);
      console.log('Strava tokens stored successfully');
      console.log('Activities data structure:', activities);

      // Pass calories to parent if available
      if (dailyCalories && onCaloriesUpdate) {
        console.log('Passing Strava daily calories to parent:', dailyCalories);
        onCaloriesUpdate(dailyCalories);
      }

      // Format the data for display
      setData({
        displayName: `${profile.firstname} ${profile.lastname}`,
        memberSince: profile.created_at,
        activities: activities,
        id: profile.id
      });

      {/*
      // Pass calories to parent if available
      if (dailyCalories && onCaloriesUpdate) {
        console.log('Passing Strava calories to parent:', dailyCalories);
        onCaloriesUpdate(dailyCalories);
      }
      */}

      setError(null);
    } catch (err) {
      console.error('Failed to process Strava data:', err);
      setError('Failed to process Strava data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleOAuthCallback);
    return () => window.removeEventListener('message', handleOAuthCallback);
  }, []);

  const handleStravaLogin = async () => {
    try {
      console.log('Initiating Strava login...');
      setLoading(true);
      setError(null);

      // Get auth URL from backend using api service
      console.log('Fetching Strava auth URL...');
      const response = await api.get('/api/strava/auth');
      console.log('Received auth URL from server');

      // Try popup first
      const width = 600;
      const height = 800;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      console.log('Opening Strava auth popup...');
      const popup = window.open(
        response.data.authUrl,
        'Strava Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // If popup blocked, fallback to redirect
      if (!popup) {
        console.log('Popup blocked, falling back to redirect');
        window.location.href = response.data.authUrl;
        return;
      }

    } catch (err) {
      console.error('Strava auth initialization error:', err);
      setError('Failed to initialize Strava authentication');
      setLoading(false);
    }
  };

  // Modify the activities display to show calories
  const renderActivity = (activity, index) => {
    // Determine which icon to show
    let iconPath;
    const activityType = activity.type?.toLowerCase() || '';
    const activityName = activity.name?.toLowerCase() || '';

    if (activityName.includes('rowing') || activityType === 'Rowing') {
      iconPath = "/images/rowerWhite64.png";
    } else if (activityType === 'Run' || activityName.includes('run')) {
      iconPath = "/images/speed.png";
    } else if (activityType === 'Walk' || activityName.includes('walk')) {
      iconPath = "/images/walking.png";
    } else if (
      activityType === 'WeightTraining' || 
      activityType === 'Crossfit' || 
      activityType === 'Workout' || 
      activityType === 'Yoga' ||
      activityName.includes('weight') || 
      activityName.includes('gym') || 
      activityName.includes('training')
    ) {
      iconPath = "/images/workout.png";
    }

    const isRowing = activityType === 'rowing' || activityName.includes('rowing');

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
                alt={activity.type}
                className={`${isRowing ? 'w-12 h-12' : 'w-8 h-8'}`}
              />
            )}
            <h5 className={`${isRowing ? 'text-xl' : 'text-lg'} font-medium`}>{activity.name}</h5>
          </div>
        </div>
        
        <div className="space-y-2 text-sm text-gray-400">
          {activity.distance && (
            <p className="text-[#FC4C02] font-medium">
              {(activity.distance / 1000).toFixed(2)} km
            </p>
          )}
          {activity.calories && (
            <p className="text-green-400 font-medium">
              {activity.calories} cal
            </p>
          )}
          <p>{Math.round(activity.moving_time / 60)} minutes</p>
          <p className="text-xs">{new Date(activity.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    );
  };

  if (!data) {
    return (
      <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-transparent h-full flex-col justify-center items-center shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]">
      {/*<div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full flex flex-col justify-center items-center">*/}
        {error && (
          <div className="text-red-400 text-center mb-4">
            <p>{error}</p>
          </div>
        )}
        <button 
          onClick={handleStravaLogin}
          disabled={loading}
          // Old className: className="flex items-center gap-2 bg-[#FC4C02] hover:bg-[#ff6934] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          className="group px-8 py-4 bg-gradient-to-r from-[#FC4C02]/20 to-[#111827]/60 text-[#FC4C02] font-semibold border-2 border-[#FC4C02]/50 rounded-xl shadow-[0_0_12px_2px_rgba(252,76,2,0.3)] hover:shadow-[0_0_16px_4px_rgba(252,76,2,0.35)] hover:bg-[#1e293b]/60 hover:border-[#FC4C02]/60 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 backdrop-blur relative overflow-hidden text-lg"
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
    <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-transparent h-full flex flex-col justify-center items-center shadow-[0_0_0_1px_rgba(252,76,2,0.6),0_0_12px_3px_rgba(252,76,2,0.25)]">
    {/*<div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full flex flex-col">*/}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.activities.map((activity, index) => renderActivity(activity, index))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StravaDisplay; 