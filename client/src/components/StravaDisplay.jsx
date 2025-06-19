import React from 'react';

const StravaDisplay = ({ data }) => {
  if (!data) {
    return null;
  }

  return (
    <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full flex flex-col">
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
              onClick={() => {
                const stravaComponent = document.querySelector('[data-testid="strava-login"]');
                if (stravaComponent) {
                  stravaComponent.querySelector('button').click();
                }
              }}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.activities.map((activity, index) => {
              const isRowing = activity.type === "Rowing";
              return (
                <div 
                  key={index}
                  className={`bg-[#ffffff0a] rounded-lg p-4 flex flex-col ${
                    isRowing ? 'sm:col-span-2 lg:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={isRowing ? "/images/rowerWhite64.png" : "/images/workout.png"}
                        alt={activity.type}
                        className={`${isRowing ? 'w-12 h-12' : 'w-8 h-8'}`}
                      />
                      <h5 className={`${isRowing ? 'text-xl' : 'text-lg'} font-medium`}>{activity.name}</h5>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-400">
                    {activity.distance && (
                      <p className="text-[#FC4C02] font-medium">
                        {(activity.distance / 1000).toFixed(2)} km
                      </p>
                    )}
                    <p>{Math.round(activity.moving_time / 60)} minutes</p>
                    <p className="text-xs">{new Date(activity.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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