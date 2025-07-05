import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getCardStyles, getTextStyles, getButtonStyles } from '../utils/styleUtils';

const DietaryGoals = ({ dietOptions, formData: { dietGoals }, toggleDietGoal }) => {
  const { themeMode, currentTheme } = useTheme();
  
  // Generate theme-aware styles
  const cardStyles = getCardStyles(themeMode, 'base', { layout: 'full' });
  const titleStyles = getTextStyles(themeMode, 'heading');
  const categoryStyles = getTextStyles(themeMode, 'caption');
  const activeButtonStyles = getButtonStyles(themeMode, 'primary');
  
  // Use theme system for inactive button styling instead of hardcoded borders
  const inactiveButtonStyles = `${getButtonStyles(themeMode, 'secondary')}`;
  
  return (
    <div className={cardStyles}>
      <h3 className={`${titleStyles} mb-4`}>Dietary Goals</h3>
      <div className="flex-1 space-y-6">
        {Object.entries(dietOptions).map(([category, options]) => (
          <div key={category} className="mb-4">
            <h4 className={`${categoryStyles} mb-3`}>{category}</h4>
            <div className="flex flex-wrap gap-2">
              {options.map((goal) => (
                <button
                  key={goal}
                  onClick={() => toggleDietGoal(goal)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    dietGoals.includes(goal)
                      ? activeButtonStyles
                      : inactiveButtonStyles
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DietaryGoals; 