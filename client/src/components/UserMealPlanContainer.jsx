// client/src/components/UserMealPlanContainer.jsx
import React, { useState, useRef, useEffect } from 'react';
import UserMealPlan from './UserMealPlan';
import UserMealPlanCalendar from './UserMealPlanCalendar';
import GuestView from '../views/GuestView';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

const UserMealPlanContainer = ({ userId, setUser, guestData = null }) => {
  const [activeTab, setActiveTab] = useState('report'); // 'report' or 'calendar'
  const [mealPlanData, setMealPlanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reportCardRef = useRef();
  const calendarRef = useRef();
  const { themeMode } = useTheme();
  const isDarkMode = themeMode === 'dark';

  // Fetch for logged-in user only (skip for guests)
  useEffect(() => {
    if (userId && userId !== 'guest' && !guestData) {
      setLoading(true);
      setError(null);
      api
        .get(`/api/meal-plans/user-meal-plans/${userId}`)
        .then((res) => setMealPlanData(res.data))
        .catch(() => setError('Failed to load meal plan.'))
        .finally(() => setLoading(false));
    }
  }, [userId, guestData]);

  // Load guest data directly if provided
  useEffect(() => {
    if (guestData) {
      console.log('Loading guest data:', guestData);
      setMealPlanData(guestData);
      setLoading(false);
      setError(null);
    }
  }, [guestData]);

  const handleRefresh = () => {
    if (activeTab === 'report' && reportCardRef.current) {
      reportCardRef.current.refresh();
    } else if (activeTab === 'calendar' && calendarRef.current) {
      calendarRef.current.refresh();
    }
  };

  // 1️⃣ Render GuestView if neither a logged-in user nor demo guest data is present
  if (!userId && !guestData) {
    return <GuestView setUser={setUser} />;
  }

  // 2️⃣ Render loading state if needed
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-blue-500 text-lg animate-pulse">Loading Meal Plan...</p>
      </div>
    );
  }

  // 3️⃣ Render error state if needed
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  // 4️⃣ Render tabs + meal plan if data is loaded
  return (
    <div
      className={`h-full flex flex-col rounded-2xl p-6 border ${
        isDarkMode
          ? 'bg-[#252B3B]/50 backdrop-blur-sm border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]'
          : 'bg-white/95 backdrop-blur-sm border-blue-200/30 shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_0_12px_3px_rgba(59,130,246,0.1)]'
      }`}
    >
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
            activeTab === 'report'
              ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]'
              : isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-[#374151]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-blue-50'
          }`}
        >
          Report Card
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
            activeTab === 'calendar'
              ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]'
              : isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-[#374151]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-blue-50'
          }`}
        >
          Calendar View
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {activeTab === 'report' ? (
          <UserMealPlan ref={reportCardRef} userId={userId} mealPlanData={mealPlanData} />
        ) : (
          <UserMealPlanCalendar ref={calendarRef} userId={userId} mealPlanData={mealPlanData} />
        )}
      </div>
    </div>
  );
};

export default UserMealPlanContainer;
