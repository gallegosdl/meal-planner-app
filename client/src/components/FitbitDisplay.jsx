import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { getCardStyles, getTextStyles, getButtonStyles } from '../utils/styleUtils';

const FitbitDisplay = ({ onCaloriesUpdate }) => {
  // THEME FRAMEWORK INTEGRATION
  const { themeMode, currentTheme } = useTheme();
  
  // Generate theme-aware styles using the theme system
  const containerStyles = getCardStyles(themeMode, 'base', { layout: 'full' });
  const connectButtonStyles = getButtonStyles(themeMode, 'fitbit_connect');
  
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
        handleFitbitData(parsedData);
        navigate(location.pathname, { replace: true });
      } catch (err) {
        console.error('Failed to parse Fitbit data:', err);
        setError('Failed to process Fitbit data');
      }
    } else if (errorMessage) {
      console.log('Found error message in URL:', errorMessage);
      setError(decodeURIComponent(errorMessage));
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  // Function to handle messages from popup window
  const handleOAuthCallback = async (event) => {
    console.log('Received message event:', event);
    if (!event.data || event.data.type !== 'fitbit_callback') {
      console.log('Not a Fitbit callback event:', event.data?.type);
      return;
    }
    
    if (event.data.error) {
      console.error('Fitbit OAuth error:', event.data.error);
      setError(event.data.error);
      setLoading(false);
      return;
    }

    console.log('Received valid Fitbit callback data:', event.data);
    handleFitbitData(event.data.data);
  };

  // Common function to handle Fitbit data
  const handleFitbitData = async (responseData) => {
    try {
      console.log('handleFitbitData called with:', responseData);
      const { profile, tokens, allData } = responseData;
      
      // Store tokens in session
      console.log('Storing Fitbit tokens...');
      await api.post('/api/fitbit/store-tokens', tokens);
      console.log('Fitbit tokens stored successfully');
      console.log('Activities data structure:', allData);

      // Calculate total calories from activities only
      const activitiesCalories = allData?.activities?.daily?.activities?.reduce((sum, activity) => {
        return sum + (activity.calories || 0);
      }, 0) || 0;

      console.log('Activities List:', allData?.activities?.daily?.activities);
      console.log('Activities Calories Total:', activitiesCalories);

      // Pass calories to parent component if callback exists
      if (onCaloriesUpdate) {
        console.log('Passing Fitbit activities calories to parent:', activitiesCalories);
        onCaloriesUpdate(activitiesCalories);
      }

      // Format the data for display
      setData({
        displayName: profile.displayName || profile.fullName,
        memberSince: profile.memberSince,
        allData: allData,
        id: profile.encodedId
      });

      setError(null);
    } catch (err) {
      console.error('Failed to process Fitbit data:', err);
      setError('Failed to process Fitbit data. Please try again.');
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

      // Get auth URL from backend using api service
      const response = await api.get('/api/fitbit/auth');

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

      // Monitor popup window
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          console.log('Popup window was closed');
          clearInterval(checkPopup);
          setLoading(false);
        }
      }, 1000);

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
      <div className={containerStyles}>
        {error && (
          <div className="text-red-400 text-center mb-4">
            <p>{error}</p>
          </div>
        )}
        <button 
          onClick={handleFitbitLogin}
          disabled={loading}
          className={connectButtonStyles}
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
    <div className={containerStyles}>
      <div className={currentTheme.text.primary}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-3">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                themeMode === 'light' 
                  ? 'bg-[#00B0B9]/10 text-[#00B0B9] border border-[#00B0B9]/30' 
                  : 'bg-[#00B0B9]/20 text-[#00B0B9] border border-[#00B0B9]/40'
              }`}>
                <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                Fitbit Connected
              </div>
              <span className={`${currentTheme.text.primary} font-normal`}>{data.displayName || data.fullName}</span>
              {data.age && <span className={`${currentTheme.text.primary} font-normal`}> ({data.age} years)</span>}
            </h3>
            <p className={`text-sm ${currentTheme.text.secondary}`}>Last synced: {new Date().toLocaleString()}</p>
          </div>
          <div className="flex items-end gap-6">
            <div className={`text-right p-3 rounded-lg ${
              themeMode === 'light' 
                ? 'bg-[#00B0B9]/5 border border-[#00B0B9]/20' 
                : 'bg-[#00B0B9]/10 border border-[#00B0B9]/30'
            }`}>
              <p className={`text-sm ${currentTheme.text.secondary}`}>Member Since</p>
              <p className={`text-base ${currentTheme.text.primary}`}>{new Date(data.memberSince).toLocaleDateString()}</p>
            </div>
            <button 
              onClick={handleFitbitLogin}
              className="self-start mt-[8px] text-[#00B0B9] hover:text-[#00B0B9]/80 transition-colors"
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
              <p className="text-sm text-gray-500 mb-1">Today's Steps</p>
              <p className="text-2xl font-semibold text-[#00B0B9]">{Number(data.allData.activities.daily.summary.steps).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Bottom Section - Activity Badges */}
        <div className={`mt-3 pt-4 border-t ${themeMode === 'light' ? 'border-[#00B0B9]/30' : 'border-[#00B0B9]/40'}`}>
          <h4 className={`text-lg font-semibold mb-4 ${currentTheme.text.primary}`}>Today's Activities</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.allData?.activities?.daily?.activities?.map((activity, index) => {
              if (!activity) return null;

              // Determine which icon to show and activity type/colors with rings
              let iconPath, activityType, bgColor, ringColor;
              const activityName = activity.name?.toLowerCase() || '';

              if (activityName.includes('rowing')) {
                iconPath = "/images/rowerWhite64.png";
                activityType = 'Row';
                bgColor = themeMode === 'light' ? 'bg-purple-50' : 'bg-purple-400/10';
                ringColor = 'border-purple-500';
              } else if (activityName.includes('run')) {
                iconPath = themeMode === 'light' ? "/images/speed-blue.png" : "/images/speed.png";
                activityType = 'Run';
                bgColor = themeMode === 'light' ? 'bg-blue-50' : 'bg-blue-200/20';
                ringColor = 'border-blue-900';
              } else if (activityName.includes('walk')) {
                iconPath = "/images/walking.png";
                activityType = 'Walk';
                bgColor = themeMode === 'light' ? 'bg-green-50' : 'bg-green-400/10';
                ringColor = 'border-green-500';
              } else if (activityName.includes('weightlifting')) {
                iconPath = "/images/workout.png";
                activityType = 'Workout';
                bgColor = themeMode === 'light' ? 'bg-orange-50' : 'bg-orange-400/10';
                ringColor = 'border-orange-500';
              } else if (activityName.includes('activity')) {
                iconPath = "/images/workout.png";
                activityType = 'Activity';
                bgColor = themeMode === 'light' ? 'bg-orange-50' : 'bg-orange-400/10';
                ringColor = 'border-orange-500';
              } else {
                iconPath = "/images/workout.png";
                activityType = 'Exercise';
                bgColor = themeMode === 'light' ? 'bg-orange-50' : 'bg-orange-400/10';
                ringColor = 'border-orange-500';
              }

              return (
                <div 
                  key={index}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:scale-105 transition-all duration-200 hover:shadow-md text-center"
                >
                  {/* Activity Type - Above */}
                  <div className="flex flex-col items-center">
                    <span className={`font-semibold ${currentTheme.text.primary}`}>
                      {activityType === 'Run' && activity.distance 
                        ? `${activityType} - ${parseFloat(activity.distance).toFixed(1)} km`
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
                    {/* Show distance only for non-run activities */}
                    {activity.distance && activityType !== 'Run' && (
                      <div className="flex items-center gap-1">
                        <span className="text-2xl font-bold text-blue-600">{parseFloat(activity.distance).toFixed(1)}</span>
                        <span className="text-gray-500 font-medium">km</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      {activity.calories && (
                        <div className="flex items-center gap-1">
                          <span className="text-xl font-bold text-orange-600">{activity.calories}</span>
                          <span className="text-gray-500 font-medium">cal</span>
                        </div>
                      )}
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xl font-bold text-green-600">{Math.round(activity.duration / 60000)}</span>
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

export default FitbitDisplay; 