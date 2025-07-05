import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getCardStyles, getTextStyles, getInputStyles } from '../utils/styleUtils';

const MealPreferences = ({ formData: { likes, dislikes }, handleChange }) => {
  const { themeMode, currentTheme } = useTheme();
  
  // Generate theme-aware styles
  const cardStyles = getCardStyles(themeMode, 'base', { layout: 'full' });
  const titleStyles = getTextStyles(themeMode, 'heading');
  const descriptionStyles = getTextStyles(themeMode, 'caption');
  const labelStyles = getTextStyles(themeMode, 'label');
  const inputStyles = getInputStyles(themeMode);
  
  return (
    <div className={cardStyles}>
      <h2 className={`${titleStyles} mb-2`}>Meal Preferences</h2>
      <p className={`${descriptionStyles} mb-2`}>
        Separate multiple foods with commas. This helps prioritize ingredients for meal planning.
      </p>
      <div className="space-y-4">
        <div>
          <label className={`block ${labelStyles} mb-2`}>
            Foods You Like
          </label>
          <input
            type="text"
            value={likes}
            onChange={(e) => handleChange('likes', e.target.value)}
            placeholder="e.g. Chicken, Rice, Broccoli"
            className={`${inputStyles} w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none`}
          />
        </div>
        <div>
          <label className={`block ${labelStyles} mb-2`}>
            Foods to Avoid
          </label>
          <input
            type="text"
            value={dislikes}
            onChange={(e) => handleChange('dislikes', e.target.value)}
            placeholder="e.g. Mushrooms, Seafood"
            className={`${inputStyles} w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none`}
          />
        </div>
      </div>
    </div>
  );
};

export default MealPreferences; 