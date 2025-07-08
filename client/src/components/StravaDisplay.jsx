// client/src/components/StravaDisplay.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { getCardStyles, getTextStyles, getButtonStyles } from '../utils/styleUtils';

const StravaDisplay = ({ user, onCaloriesUpdate }) => {
  const isGuest = user?.guest === true;
  const isLoggedIn = user && (user.guest === false || user.sessionToken);
  console.log('[StravaDisplay] rendering with user:', user);
  console.log('[StravaDisplay] isGuest:', isGuest);
  console.log('[StravaDisplay] isLoggedIn:', isLoggedIn);

  // THEME FRAMEWORK INTEGRATION
  const { themeMode, currentTheme } = useTheme();
  
  // Generate theme-aware styles using the theme system
  const containerStyles = getCardStyles(themeMode, 'base', { layout: 'full' });
  const connectButtonStyles = getButtonStyles(themeMode, 'strava_connect');
  
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

  const fetchGuestData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/strava/guest');
      console.log('Guest Strava JSON:', response.data);
      handleStravaData(response.data);
    } catch (err) {
      console.error('Error fetching guest Strava data:', err);
      setError('Could not load guest Strava data.');
    } finally {
      setLoading(false);
    }
  };

  const handleStravaData = async (responseData) => {
    try {
      console.log('Full Strava response data:', responseData);
      const { profile, tokens, activities, dailyCalories } = responseData;
      
      // Log activities in detail
      console.log('Activities detail:', activities?.map(activity => ({
        id: activity.id,
        type: activity.type,
        name: activity.name,
        sport_type: activity.sport_type
      })));

      // Store tokens in session
      if (tokens) {
        console.log('Storing Fitbit tokens...');
        await api.post('/api/fitbit/store-tokens', tokens);
        console.log('Fitbit tokens stored successfully');
      } else {
        console.log('Guest mode - no tokens to store');
      }
      console.log('Strava tokens stored successfully');

      // Format the data for display
      setData({
        displayName: `${profile.firstname} ${profile.lastname}`,
        memberSince: profile.created_at || '2020-01-01',
        activities: activities,
        id: profile.id || 'GUEST123'
      });

      // Pass calories to parent if available
      if (dailyCalories && onCaloriesUpdate) {
        console.log('Passing Strava daily calories to parent:', dailyCalories);
        onCaloriesUpdate(dailyCalories);
      }

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

      // Monitor popup window
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          console.log('Popup window was closed');
          clearInterval(checkPopup);
          setLoading(false);
        }
      }, 1000);

    } catch (err) {
      console.error('Strava auth initialization error:', err);
      setError('Failed to initialize Strava authentication');
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className={containerStyles}>
        {error && (
          <div className="text-red-400 text-center mb-4">
            <p>{error}</p>
          </div>
        )}
  
        {(isGuest || !user) && (
          <button
            onClick={fetchGuestData}
            disabled={loading}
            className={connectButtonStyles}
          >
            {loading ? 'Loading Guest Data...' : 'Load Guest Strava Data'}
          </button>
        )}
  
        {isLoggedIn && (
          <button 
            onClick={handleStravaLogin}
            disabled={loading}
            className={connectButtonStyles}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
                </svg>
                Connect Strava
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={containerStyles}>
      <div className={currentTheme.text.primary}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-3">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                themeMode === 'light' 
                  ? 'bg-[#FC4C02]/10 text-[#FC4C02] border border-[#FC4C02]/30' 
                  : 'bg-[#FC4C02]/20 text-[#FC4C02] border border-[#FC4C02]/40'
              }`}>
                <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                Strava Connected
              </div>
              <span className={`${currentTheme.text.primary} font-normal`}>{data.displayName}</span>
            </h3>
            <p className={`text-sm ${currentTheme.text.secondary}`}>Last synced: {new Date().toLocaleString()}</p>
          </div>
          <div className="flex items-end gap-6">
            <div className={`text-right p-3 rounded-lg ${
              themeMode === 'light' 
                ? 'bg-[#FC4C02]/5 border border-[#FC4C02]/20' 
                : 'bg-[#FC4C02]/10 border border-[#FC4C02]/30'
            }`}>
              <p className={`text-sm ${currentTheme.text.secondary}`}>Member Since</p>
              <p className={`text-base ${currentTheme.text.primary}`}>{new Date(data.memberSince).toLocaleDateString()}</p>
            </div>
            <button 
              onClick={handleStravaLogin}
              className="self-start mt-[8px] text-[#FC4C02] hover:text-[#FC4C02]/80 transition-colors"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Section - Activity Badges */}
        <div className={`mt-3 pt-4 border-t ${themeMode === 'light' ? 'border-[#FC4C02]/30' : 'border-[#FC4C02]/40'}`}>
          <h4 className={`text-lg font-semibold mb-4 ${currentTheme.text.primary}`}>Recent Activities</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.activities?.map((activity, index) => {
              if (!activity) return null;

              // Determine which icon to show and activity type/colors with rings
              let iconPath, activityType, bgColor, ringColor;
              const stravaActivityType = activity.type;
              const activityName = activity.name?.toLowerCase() || '';

              if (stravaActivityType === 'Rowing' || activityName.includes('rowing')) {
                iconPath = themeMode === 'light' ? "/images/rowerPurple64.png" : "/images/rowerWhite64.png";
                activityType = 'Row';
                bgColor = themeMode === 'light' ? 'bg-purple-50' : 'bg-purple-400/10';
                ringColor = 'border-purple-500';
              } else if (['Run', 'VirtualRun'].includes(stravaActivityType) || activityName.includes('run')) {
                iconPath = themeMode === 'light' ? "/images/speed-blue.png" : "/images/speed.png";
                activityType = 'Run';
                bgColor = themeMode === 'light' ? 'bg-blue-50' : 'bg-blue-200/20';
                ringColor = 'border-blue-900';
              } else if (['Walk', 'Hike'].includes(stravaActivityType) || activityName.includes('walk')) {
                iconPath = "/images/walking.png";
                activityType = 'Walk';
                bgColor = themeMode === 'light' ? 'bg-green-50' : 'bg-green-400/10';
                ringColor = 'border-green-500';
              } else if (['WeightTraining', 'Crossfit', 'Workout', 'Yoga'].includes(stravaActivityType) || activityName.includes('training')) {
                iconPath = themeMode === 'light' ? "/images/workoutOrange.png" : "/images/workout.png";
                activityType = 'Workout';
                bgColor = themeMode === 'light' ? 'bg-orange-50' : 'bg-orange-400/10';
                ringColor = 'border-orange-500';
              } else {
                iconPath = "/images/workout.png";
                activityType = 'Exercise';
                bgColor = themeMode === 'light' ? 'bg-gray-50' : 'bg-gray-400/10';
                ringColor = 'border-gray-500';
              }

              return (
                <div 
                  key={index}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:scale-105 transition-all duration-200 hover:shadow-md text-center"
                >
                  {/* Activity Type - Above */}
                  <div className="flex flex-col items-center">
                    <span className={`font-semibold ${currentTheme.text.primary}`}>
                      {activity.distance 
                        ? `${activityType} - ${(activity.distance / 1000).toFixed(1)} km`
                        : activityType
                      }
                    </span>
                  </div>
                  
                  {/* Activity Badge Circle with Ring */}
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center ${bgColor} ${ringColor} border-[6px] flex-shrink-0`}>
                    {iconPath && (
                      <img 
                        src={iconPath}
                        alt={activity.type}
                        className="w-15 h-15"
                      />
                    )}
                  </div>
                  
                  {/* Activity Metrics - Below */}
                  <div className="flex flex-col items-center gap-1 text-sm">
                    {/* Distance is now shown in header, so don't show it here */}
                    <div className="flex items-center gap-3">
                      {activity.calories && (
                        <div className="flex items-center gap-1">
                          <span className="text-xl font-bold text-orange-600">{activity.calories}</span>
                          <span className="text-gray-500 font-medium">cal</span>
                        </div>
                      )}
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xl font-bold text-green-600">{Math.round(activity.moving_time / 60)}</span>
                        <span className="text-gray-500 font-medium">min</span>
                      </div>
                    </div>
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