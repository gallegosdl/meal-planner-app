import React from 'react';

const Header = ({ user, handleLogout }) => {
  return (
    <div className="mb-8 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 relative flex-shrink-0"> {/* New NutriSyncAI logo */}
          <img 
            src="/images/NutriSyncAI-logo.png" 
            alt="NutriSync AI Logo" 
            className="absolute inset-0 w-full h-full object-contain rounded-xl"
          />
        </div>
        {/* Original logo */}
        {/*<div className="w-24 h-24 relative flex-shrink-0"> 
          <img 
            src="/images/DGMealPlanner.png" 
            alt="Meal Planner Logo" 
            className="absolute inset-0 w-full h-full object-contain rounded-xl"
          />
        </div>
        {/* SVG Logo wrapper */}
        {/*<div className="w-24 h-24 relative flex-shrink-0"> 
          <svg
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            className="absolute inset-0 w-full h-full"
          >
            <rect width="100%" height="100%" fill="none"/>
            <path
              d="M256 800 L256 224 L768 800 L768 224"
              fill="none"
              stroke="#00BFFF"
              stroke-width="80"
              stroke-linecap="round"
              stroke-linejoin="round"
              opacity="0.95"/>
            <circle cx="256" cy="224" r="32" fill="#00BFFF" opacity="0.85"/>
            <circle cx="768" cy="224" r="32" fill="#00BFFF" opacity="0.85"/>
            <circle cx="256" cy="800" r="32" fill="#00BFFF" opacity="0.85"/>
            <circle cx="768" cy="800" r="32" fill="#00BFFF" opacity="0.85"/>
          </svg>
        </div>*/}
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight border-b-2 border-blue-400/30 pb-1 shadow-[0_4px_8px_-4px_rgba(59,130,246,0.5)]">
            NutriSync <span className="text-blue-400">AI</span>
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