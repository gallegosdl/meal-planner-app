import React from 'react';

const PreferredFoods = ({ formData: { likes } }) => (
  <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-transparent h-full flex flex-col justify-between shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]">
  {/*<div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">*/}
    <h2 className="text-xl font-semibold text-white mb-4">Preferred Foods</h2>
    <div className="bg-[#2A3142] rounded-lg p-4 min-h-[200px]">
      {likes.split(',').map((item, index) => (
        item.trim() && (
          <span 
            key={index}
            className="inline-block bg-blue-500/20 text-blue-400 rounded-full px-3 py-1 text-sm mr-2 mb-2"
          >
            {item.trim()}
          </span>
        )
      ))}
    </div>
  </div>
);

export default PreferredFoods; 