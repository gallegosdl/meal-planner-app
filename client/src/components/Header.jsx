import React from 'react';

const Header = ({ user, handleLogout }) => {
  return (
    <div className="mb-6 sm:mb-8">
      {/* Mobile Header */}
      <div className="flex flex-col sm:hidden gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 relative flex-shrink-0">
              <img 
                src="/images/NutriIQ.png" 
                alt="Nutri IQ Logo" 
                className="absolute inset-0 w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight border-b-2 border-blue-400/30 pb-1 shadow-[0_4px_8px_-4px_rgba(59,130,246,0.5)]">
                <span className="text-white">Nutri </span><span className="text-blue-400">IQ</span>
              </h1>
              <p className="text-gray-400 mt-1 text-xs tracking-wide">Personalized nutrition planning</p>
            </div>
          </div>
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-[#2A3142] px-3 py-2 rounded-lg border border-[#ffffff1a] hover:bg-[#313d4f] transition-colors group shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]"
              title={`Logout ${user.name}`}
            >
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.name}
                  className="w-4 h-4 rounded-full object-cover"
                  onError={(e) => {
                    // If image fails to load, show default SVG
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : (
                <div className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-xs">?</span>
                </div>
              )}
              <svg 
                className={`w-4 h-4 text-blue-400 ${user.avatar_url ? 'hidden' : ''}`} 
                viewBox="0 0 20 20" 
                fill="currentColor"
                style={{ display: user.avatar_url ? 'none' : 'block' }}
              >
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <svg 
                className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 relative flex-shrink-0">
            <img 
              src="/images/NutriIQ.png" 
              alt="Nutri IQ Logo" 
              className="absolute inset-0 w-full h-full object-contain rounded-xl"
            />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight border-b-2 border-blue-400/30 pb-1 shadow-[0_4px_8px_-4px_rgba(59,130,246,0.5)]">
              <span className="text-white">Nutri </span><span className="text-blue-400">IQ</span>
            </h1>
            <p className="text-gray-400 mt-3 text-sm tracking-wide">Personalized nutrition planning</p>
          </div>
        </div>
        {user && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-[#2A3142] px-4 py-2 rounded-lg border border-[#ffffff1a] hover:bg-[#313d4f] transition-colors group shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]"
          >
            {user.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name}
                className="w-5 h-5 rounded-full object-cover"
                onError={(e) => {
                  // If image fails to load, show default SVG
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
            ) : (
              <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-xs">?</span>
              </div>
            )}
            <svg 
              className={`w-5 h-5 text-blue-400 ${user.avatar_url ? 'hidden' : ''}`} 
              viewBox="0 0 20 20" 
              fill="currentColor"
              style={{ display: user.avatar_url ? 'none' : 'block' }}
            >
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
    </div>
  );
};

export default Header; 