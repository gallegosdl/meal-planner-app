import React from 'react';

const Header = ({ user, handleLogout }) => {
  return (
    <div className="mb-8 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 relative flex-shrink-0"> {/* Increased size wrapper */}
          <img 
            src="/images/DGMealPlanner.png" 
            alt="Meal Planner Logo" 
            className="absolute inset-0 w-full h-full object-contain rounded-xl"
          />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight border-b-2 border-blue-400/30 pb-1 shadow-[0_4px_8px_-4px_rgba(59,130,246,0.5)]">
            Meal Planner <span className="text-blue-400">AI</span>
          </h1>
          <p className="text-gray-400 mt-3 text-sm tracking-wide">Personalized nutrition planning powered by AI</p>
        </div>
      </div>
      {user && (
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-[#2A3142] px-4 py-2 rounded-lg border border-[#ffffff1a] hover:bg-[#313d4f] transition-colors group shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]"
        >
          <svg className="w-5 h-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          <div className="flex flex-col items-start">
            <span className="text-gray-400 text-xs">Logged in as</span>
            <span className="text-white font-medium group-hover:text-blue-400 transition-colors">{user.name}</span>
          </div>
          <svg 
            className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors ml-2" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
          </svg>
        </button>
      )}
    </div>
  );
};

export default Header; 