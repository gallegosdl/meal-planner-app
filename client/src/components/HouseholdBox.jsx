import React from 'react';
import VoiceIntentMealPlanButton from './VoiceIntentMealPlanButton';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { getCardStyles, getTextStyles, getButtonStyles } from '../utils/styleUtils';

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
}) => {
  const { themeMode, currentTheme } = useTheme();
  
  // Generate theme-aware styles using the theme system properly
  const cardStyles = getCardStyles(themeMode, 'base', { layout: 'full' });
  const titleStyles = getTextStyles(themeMode, 'heading');
  const subtitleStyles = getTextStyles(themeMode, 'heading');
  const labelStyles = getTextStyles(themeMode, 'caption');
  const valueStyles = getTextStyles(themeMode, 'body');
  const memberNameStyles = getTextStyles(themeMode, 'caption');
  
  // Use the theme system for button styling instead of inline styles
  const buttonStyles = `w-12 h-12 ${getButtonStyles(themeMode, 'primary')} text-lg`;
  
  // Theme-aware backgrounds for interactive elements
  const photoContainerBg = currentTheme.backgrounds.secondary.elevated;
  const photoContainerHover = currentTheme.backgrounds.interactive.hover;
  
  return (
    <div className={cardStyles}>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-2xl font-semibold ${currentTheme.text.primary} mb-0`}>
            Welcome, {householdData.householdMembers[0]?.name ? (
              <>
                {householdData.householdMembers[0].name.split(' ')[0]} {/* First name */}
              </>
            ) : (user?.name ? user.name.split(' ')[0] : 'Guest')}
          </h2>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            themeMode === 'dark' 
              ? 'bg-blue-500/20' 
              : 'bg-blue-100'
          }`}>
            <svg 
              className={`w-6 h-6 ${
                themeMode === 'dark' 
                  ? 'text-blue-400' 
                  : 'text-blue-600'
              }`}
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <span className={`text-sm ${currentTheme.text.secondary}`}>Household</span>
            <div className={`text-2xl font-semibold ${currentTheme.text.primary}`}>
              {householdData.householdSize}
            </div>
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
                    ${displayPhoto ? 'bg-transparent' : `${photoContainerBg} ${photoContainerHover}`}`}
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
                <div className={`text-xs ${currentTheme.text.secondary} text-center mt-1 truncate`}>
                  {member.name || user?.name}
                </div>
              </div>
            );
          })}
        </div>
        {/* Size Controls */}
        <div className="flex justify-between items-center mt-4">
          <button 
            className={buttonStyles}
            onClick={() => {
              const newSize = Math.max(1, householdData.householdSize - 1);
              handleChange('householdSize', newSize);
              handleChange('householdMembers', householdData.householdMembers.slice(0, newSize));
            }}
          >
            -
          </button>
          <button 
            className={buttonStyles}
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
          <h2 className={`text-xl font-semibold ${currentTheme.text.primary} mb-4`}>Weekly Budget</h2>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-sm ${currentTheme.text.secondary}`}>Weekly Budget</span>
          </div>
          <div className={`text-2xl mb-2 ${currentTheme.text.primary}`}>${householdData.budget || 75}</div>
          <input 
            type="range"
            min="30"
            max="300"
            className={`w-full ${themeMode === 'dark' ? 'accent-blue-500' : 'accent-blue-600'}`}
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
};

export default HouseholdBox; 