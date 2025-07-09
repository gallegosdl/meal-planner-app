//src/components/PreferredFoods.jsx

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getCardStyles, getTagStyles, getTextStyles } from '../utils/styleUtils';

const PreferredFoods = ({ formData }) => {
  const { themeMode, currentTheme } = useTheme();
  
  // Generate theme-aware styles
  const cardStyles = getCardStyles(themeMode, 'base', { layout: 'full' });
  const titleStyles = getTextStyles(themeMode, 'heading');
  const tagStyles = getTagStyles(themeMode, 'blue');
  const placeholderStyles = getTextStyles(themeMode, 'caption');
  
  // Use theme system for inner content area borders instead of hardcoded borders
  const innerContentStyles = `${currentTheme.backgrounds.secondary.elevated} rounded-lg p-4 min-h-[120px] flex flex-wrap gap-2 content-start border ${currentTheme.borders.primary}`;
  
  return (
    <div className={cardStyles}>
      <h3 className={`${titleStyles} mb-4`}>Preferred Foods</h3>
      <div className="flex-1">
        <div className={innerContentStyles}>
          {formData.likes && formData.likes.split(',').map((item, index) => (
            item.trim() && (
              <span 
                key={index}
                className={tagStyles}
              >
                {item.trim()}
              </span>
            )
          ))}
          {(!formData.likes || formData.likes.trim() === '') && (
            <span className={placeholderStyles}>
              Enter preferred foods in Meal Preferences
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreferredFoods; 