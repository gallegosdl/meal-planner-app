import React, { useState, useRef } from 'react';
import UserMealPlan from './UserMealPlan';
import UserMealPlanCalendar from './UserMealPlanCalendar';
import { useTheme } from '../contexts/ThemeContext';

const UserMealPlanContainer = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('report'); // 'report' or 'calendar'
  const reportCardRef = useRef();
  const calendarRef = useRef();
  const { themeMode } = useTheme();
  const isDarkMode = themeMode === 'dark';

  const handleRefresh = () => {
    if (activeTab === 'report' && reportCardRef.current) {
      reportCardRef.current.refresh();
    } else if (activeTab === 'calendar' && calendarRef.current) {
      calendarRef.current.refresh();
    }
  };

  return (
    <div className={`h-full flex flex-col rounded-2xl p-6 border ${
      isDarkMode 
        ? 'bg-[#252B3B]/50 backdrop-blur-sm border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]'
        : 'bg-white border-gray-200 shadow-lg'
    }`}>
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
            activeTab === 'report'
              ? 'bg-blue-500 text-white'
              : isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-[#374151]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Report Card
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
            activeTab === 'calendar'
              ? 'bg-blue-500 text-white'
              : isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-[#374151]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Calendar View
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {activeTab === 'report' ? (
          <UserMealPlan ref={reportCardRef} userId={userId} />
        ) : (
          <UserMealPlanCalendar ref={calendarRef} userId={userId} />
        )}
      </div>
    </div>
  );
};

export default UserMealPlanContainer; 