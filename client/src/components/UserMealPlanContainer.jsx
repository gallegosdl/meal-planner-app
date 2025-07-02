import React, { useState, useRef } from 'react';
import UserMealPlan from './UserMealPlan';
import UserMealPlanCalendar from './UserMealPlanCalendar';

const UserMealPlanContainer = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('report'); // 'report' or 'calendar'
  const reportCardRef = useRef();
  const calendarRef = useRef();

  const handleRefresh = () => {
    if (activeTab === 'report' && reportCardRef.current) {
      reportCardRef.current.refresh();
    } else if (activeTab === 'calendar' && calendarRef.current) {
      calendarRef.current.refresh();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]">
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
            activeTab === 'report'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#374151]'
          }`}
        >
          Report Card
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
            activeTab === 'calendar'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#374151]'
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