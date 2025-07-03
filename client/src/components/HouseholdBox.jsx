import React from 'react';
import VoiceIntentMealPlanButton from './VoiceIntentMealPlanButton';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

const HouseholdBox = ({ 
  householdData, 
  handlePhotoUpload, 
  updateHouseholdSize, 
  handleChange, 
  setIsPantryModalOpen,
  onMealPlanGenerated,
  isLoading,
  setIsLoading,
  user
}) => (
  
  <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-transparent h-full flex flex-col justify-between 
  shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]">
    {/*<div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] h-full flex flex-col justify-center items-center">*/}
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-white">
          Welcome, {householdData.householdMembers[0]?.name ? (
            <>
              {householdData.householdMembers[0].name.split(' ')[0]} {/* First name */}
            </>
          ) : (user?.name ? user.name.split(' ')[0] : 'Guest')}
        </h2>
        {/*<button
          onClick={() => setIsPantryModalOpen(true)}
          className="px-4 py-2 bg-[#111827]/50 text-blue-200 font-semibold border border-blue-400/40 rounded-lg shadow-[0_0_8px_1px_rgba(100,180,255,0.25)] hover:bg-[#1e293b]/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 backdrop-blur"
        >
          <ClipboardDocumentListIcon className="w-5 h-5 text-white" />
          Pantry
        </button>*/}
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <svg 
            className="w-6 h-6 text-blue-400" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <span className="text-sm text-gray-400">Household</span>
          <div className="text-2xl font-semibold">{householdData.householdSize}</div>
        </div>
      </div>
      {/* Member Photos Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {householdData.householdMembers.slice(0, 1).map((member) => {
          // Use local photo first, then OAuth avatar as fallback
          const displayPhoto = member.photo || user?.avatar_url;
          
          return (
            <div key={member.id} className="relative group">
              <label 
                className={`block w-full aspect-square rounded-xl cursor-pointer overflow-hidden
                  ${displayPhoto ? 'bg-transparent' : 'bg-[#2A3142] hover:bg-[#313d4f]'}`}
              >
                {displayPhoto ? (
                  <img 
                    src={displayPhoto} 
                    alt={member.name || user?.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // If image fails to load, show default avatar
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                {!displayPhoto && (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
                {/* Fallback div for when image fails to load */}
                <div className="w-full h-full flex items-center justify-center" style={{ display: 'none' }}>
                  <span className="text-2xl">👤</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(member.id, e.target.files[0])}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs text-white">Change Photo</span>
                </div>
              </label>
              <div className="text-xs text-gray-400 text-center mt-1 truncate">
                {member.name || user?.name}
              </div>
            </div>
          );
        })}
      </div>
      {/* Size Controls */}
      <div className="flex justify-between items-center mt-4">
        <button 
          className="w-12 h-12 bg-[#2A3142] rounded-xl flex items-center justify-center hover:bg-[#313d4f] transition-colors" 
          onClick={() => {
            const newSize = Math.max(1, householdData.householdSize - 1);
            handleChange('householdSize', newSize);
            handleChange('householdMembers', householdData.householdMembers.slice(0, newSize));
          }}
        >
          -
        </button>
        <button 
          className="w-12 h-12 bg-[#2A3142] rounded-xl flex items-center justify-center hover:bg-[#313d4f] transition-colors"
          onClick={() => {
            const newSize = householdData.householdSize + 1;
            handleChange('householdSize', newSize);
            handleChange('householdMembers', [
              ...householdData.householdMembers,
              { id: newSize, name: `Member ${newSize}`, photo: null }
            ]);
          }}
        >
          +
        </button>
      </div>
      {/* Weekly Budget */}
      <div className="pt-6">
        <h2 className="text-xl font-semibold text-white mb-4">Weekly Budget</h2>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-400">Weekly Budget</span>
        </div>
        <div className="text-2xl mb-2">${householdData.budget || 75}</div>
        <input 
          type="range"
          min="30"
          max="300"
          className="w-full accent-blue-500"
          value={householdData.budget || 75}
          onChange={(e) => handleChange('budget', parseInt(e.target.value))}
        />
      </div>
      <div className="mt-8">
        <VoiceIntentMealPlanButton
          onMealPlanGenerated={onMealPlanGenerated}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </div>
    </div>
  </div>
);

export default HouseholdBox; 