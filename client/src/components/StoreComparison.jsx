import React from 'react';

const StoreComparison = ({ comparisonData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="animate-pulse bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
        <div className="h-6 w-48 bg-[#2A3142] rounded mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-[#2A3142] rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!comparisonData?.stores) return null;

  return (
    <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
      <h3 className="text-xl font-semibold text-white mb-6">Store Comparison</h3>
      
      <div className="grid gap-4">
        {Object.entries(comparisonData.stores).map(([storeName, data]) => (
          <div 
            key={storeName}
            className={`p-4 rounded-lg ${
              comparisonData.bestValue?.name === storeName 
                ? 'bg-blue-500/20 border border-blue-500/30' 
                : 'bg-[#2A3142]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-lg">
                {storeName}
                {comparisonData.bestValue?.name === storeName && (
                  <span className="ml-2 text-sm text-blue-400">Best Value</span>
                )}
              </h4>
              <span className="text-2xl font-semibold">${data.totalPrice}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
              <div>
                <div className="mb-1">Availability</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[#1a1f2b] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${data.availability}%` }}
                    ></div>
                  </div>
                  <span>{data.availability}%</span>
                </div>
              </div>
              
              <div>
                <div className="mb-1">Items Found</div>
                <div>{data.availableItems.length} / {data.itemCount}</div>
              </div>
            </div>

            {data.unavailableItems.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-red-400 mb-2">Unavailable Items:</div>
                <div className="flex flex-wrap gap-2">
                  {data.unavailableItems.map((item, i) => (
                    <span 
                      key={i}
                      className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded"
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoreComparison; 