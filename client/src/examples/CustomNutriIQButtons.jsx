/**
 * @fileoverview Custom Nutri IQ Button Examples
 * @version 1.0.0
 * 
 * This demonstrates how your existing custom button styles can work
 * with the theme system while preserving their unique designs.
 */

import React from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { createStyleUtils } from '../utils/styleUtils.js';

// =============================================================================
// CUSTOM NUTRI IQ BUTTON STYLES
// =============================================================================

/**
 * Custom button styles that preserve your unique designs
 * while adapting to theme changes
 */
const getNutriIQButtonStyles = (themeMode, variant = 'primary', options = {}) => {
  const { currentTheme } = useTheme();
  const { size = 'md', fullWidth = false, disabled = false } = options;
  
  // Base styles - minimal since variants include most styling
  const baseStyles = `
    focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;
  
  // Size variations - responsive like your actual buttons
  const sizeStyles = {
    sm: 'px-3 sm:px-4 py-2 sm:py-2 text-sm sm:text-sm',
    md: 'px-4 sm:px-6 py-3 sm:py-3 text-sm sm:text-base',
    lg: 'px-4 sm:px-8 py-3 sm:py-4 text-sm sm:text-lg'
  };
  
  // Your custom Nutri IQ button variants
  const variantStyles = {
    // Your blue Report Card / Tab buttons - matching exact styling
    nutri_primary: themeMode === 'dark' 
      ? `
        bg-[#111827]/50 text-blue-400 font-semibold border-2 border-blue-400/50 rounded-xl
        shadow-[0_0_12px_2px_rgba(59,130,246,0.3)]
        hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.35)] hover:bg-[#1e293b]/60 hover:border-blue-400/60
        hover:scale-[1.02] active:scale-95 transition-all backdrop-blur relative overflow-hidden
        flex items-center justify-center gap-2
      `
      : `
        bg-white/90 text-blue-600 font-semibold border-2 border-blue-400/50 rounded-xl
        shadow-[0_0_12px_2px_rgba(59,130,246,0.3)]
        hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.35)] hover:bg-blue-50/90 hover:border-blue-400/60
        hover:scale-[1.02] active:scale-95 transition-all backdrop-blur relative overflow-hidden
        flex items-center justify-center gap-2
      `,
    
    // Your meal type buttons (Breakfast, Lunch, Dinner)
    nutri_meal: themeMode === 'dark'
      ? `
        bg-blue-500 text-white border border-blue-400
        hover:bg-blue-600 hover:border-blue-300
        active:bg-blue-700 shadow-md
        focus:ring-blue-400
      `
      : `
        bg-blue-500 text-white border border-blue-400
        hover:bg-blue-600 hover:border-blue-300
        active:bg-blue-700 shadow-md
        focus:ring-blue-400
      `,
    
    // Your time filter buttons (Last Week, Last Month, All Time)
    nutri_filter: themeMode === 'dark'
      ? `
        bg-transparent text-gray-300 border border-gray-600
        hover:bg-gray-700 hover:text-white hover:border-gray-500
        active:bg-gray-800 
        focus:ring-gray-400
        data-[selected=true]:bg-blue-500 data-[selected=true]:text-white 
        data-[selected=true]:border-blue-400
      `
      : `
        bg-transparent text-gray-600 border border-gray-300
        hover:bg-gray-100 hover:text-gray-800 hover:border-gray-400
        active:bg-gray-200
        focus:ring-gray-400
        data-[selected=true]:bg-blue-500 data-[selected=true]:text-white 
        data-[selected=true]:border-blue-400
      `,
    
    // Your action buttons (Drive Your Meal Plan with Intent) - exact Nutri IQ styling
    nutri_action: themeMode === 'dark'
      ? `
        bg-[#111827]/50 text-blue-400 font-semibold border-2 border-blue-400/50 rounded-xl
        shadow-[0_0_12px_2px_rgba(59,130,246,0.3)]
        hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.35)] hover:bg-[#1e293b]/60 hover:border-blue-400/60
        hover:scale-[1.02] active:scale-95 transition-all backdrop-blur relative overflow-hidden
        flex items-center justify-center gap-2 group
      `
      : `
        bg-white/90 text-blue-600 font-semibold border-2 border-blue-400/50 rounded-xl
        shadow-[0_0_12px_2px_rgba(59,130,246,0.3)]
        hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.35)] hover:bg-blue-50/90 hover:border-blue-400/60
        hover:scale-[1.02] active:scale-95 transition-all backdrop-blur relative overflow-hidden
        flex items-center justify-center gap-2 group
      `,
    
    // Your card action buttons (Plan with Pantry, Open Pantry) - matching your actual card styling
    nutri_card_action: themeMode === 'dark'
      ? `
        bg-[#252B3B]/90 text-white border border-blue-400/20
        hover:bg-[#313d4f]/90 hover:border-blue-400/40
        active:bg-[#1e293b]/90
        shadow-xl shadow-black/30
        backdrop-blur-sm
        transform hover:scale-[1.01] transition-all duration-200
        focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-transparent
      `
      : `
        bg-white/90 text-gray-700 border border-gray-200
        hover:bg-gray-50/90 hover:border-gray-300
        active:bg-gray-100/90
        shadow-xl shadow-gray-500/20
        backdrop-blur-sm
        transform hover:scale-[1.01] transition-all duration-200
        focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2
      `,
    
              // Generate Meal Plan button - EXACT styling from your MealPlannerForm
     nutri_generate: themeMode === 'dark'
       ? `
          group bg-[#111827]/50 text-blue-400 font-semibold border-2 border-blue-400/50 rounded-xl
          shadow-[0_0_12px_2px_rgba(59,130,246,0.3)]
          hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.35)] hover:bg-[#1e293b]/60 hover:border-blue-400/60
          hover:scale-[1.02] active:scale-95 transition-all backdrop-blur relative overflow-hidden
          flex items-center justify-center gap-2 sm:gap-4
       `
       : `
          group bg-white/90 text-blue-600 font-semibold border-2 border-blue-400/50 rounded-xl
          shadow-[0_0_12px_2px_rgba(59,130,246,0.3)]
          hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.35)] hover:bg-blue-50/90 hover:border-blue-400/60
          hover:scale-[1.02] active:scale-95 transition-all backdrop-blur relative overflow-hidden
          flex items-center justify-center gap-2 sm:gap-4
       `,

     // View Recipe List button - EXACT emerald styling from your MealPlannerForm
     nutri_recipe_list: themeMode === 'dark'
       ? `
          group bg-[#111827]/50 text-emerald-400 font-semibold border-2 border-emerald-400/50 rounded-xl
          shadow-[0_0_12px_2px_rgba(16,185,129,0.3)]
          hover:shadow-[0_0_16px_4px_rgba(16,185,129,0.35)] hover:bg-[#1e293b]/60 hover:border-emerald-400/60
          hover:scale-[1.02] active:scale-95 transition-all backdrop-blur relative overflow-hidden
          flex items-center justify-center gap-2 sm:gap-4
       `
       : `
          group bg-white/90 text-emerald-600 font-semibold border-2 border-emerald-400/50 rounded-xl
          shadow-[0_0_12px_2px_rgba(16,185,129,0.3)]
          hover:shadow-[0_0_16px_4px_rgba(16,185,129,0.35)] hover:bg-emerald-50/90 hover:border-emerald-400/60
          hover:scale-[1.02] active:scale-95 transition-all backdrop-blur relative overflow-hidden
          flex items-center justify-center gap-2 sm:gap-4
       `,

     // Connect Fitbit - Teal branding with exact styling
     nutri_fitbit: themeMode === 'dark'
       ? `
          group px-8 py-4 bg-gradient-to-r from-[#00B0B9]/20 to-[#111827]/60 text-[#00B0B9] font-semibold 
          border-2 border-[#00B0B9]/50 rounded-xl 
          shadow-[0_0_12px_2px_rgba(0,176,185,0.3)] hover:shadow-[0_0_16px_4px_rgba(0,176,185,0.35)] 
          hover:bg-[#1e293b]/60 hover:border-[#00B0B9]/60 hover:scale-[1.02] active:scale-95 
          transition-all backdrop-blur relative overflow-hidden
          flex items-center justify-center gap-4
       `
       : `
          group px-8 py-4 bg-gradient-to-r from-[#00B0B9]/20 to-white/60 text-[#00B0B9] font-semibold 
          border-2 border-[#00B0B9]/50 rounded-xl 
          shadow-[0_0_12px_2px_rgba(0,176,185,0.3)] hover:shadow-[0_0_16px_4px_rgba(0,176,185,0.35)] 
          hover:bg-gray-50/60 hover:border-[#00B0B9]/60 hover:scale-[1.02] active:scale-95 
          transition-all backdrop-blur relative overflow-hidden
          flex items-center justify-center gap-4
       `,

     // Connect Strava - Orange branding with exact styling  
     nutri_strava: themeMode === 'dark'
       ? `
          group px-8 py-4 bg-gradient-to-r from-[#FC4C02]/20 to-[#111827]/60 text-[#FC4C02] font-semibold 
          border-2 border-[#FC4C02]/50 rounded-xl 
          shadow-[0_0_12px_2px_rgba(252,76,2,0.3)] hover:shadow-[0_0_16px_4px_rgba(252,76,2,0.35)] 
          hover:bg-[#1e293b]/60 hover:border-[#FC4C02]/60 hover:scale-[1.02] active:scale-95 
          transition-all backdrop-blur relative overflow-hidden
          flex items-center justify-center gap-4
       `
       : `
          group px-8 py-4 bg-gradient-to-r from-[#FC4C02]/20 to-white/60 text-[#FC4C02] font-semibold 
          border-2 border-[#FC4C02]/50 rounded-xl 
          shadow-[0_0_12px_2px_rgba(252,76,2,0.3)] hover:shadow-[0_0_16px_4px_rgba(252,76,2,0.35)] 
          hover:bg-gray-50/60 hover:border-[#FC4C02]/60 hover:scale-[1.02] active:scale-95 
          transition-all backdrop-blur relative overflow-hidden
          flex items-center justify-center gap-4
       `,

     // Voice Intent - Drive Your Meal Plan with Intent
     nutri_voice: themeMode === 'dark'
       ? `
          px-6 py-3 bg-[#111827]/50 text-blue-300 font-semibold border-2 border-blue-400/40 rounded-xl 
          shadow-[0_0_12px_2px_rgba(59,130,246,0.3)] hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.35)] 
          hover:bg-[#1e293b]/60 hover:border-blue-400/60 transition-all backdrop-blur
          flex items-center justify-center gap-3
       `
       : `
          px-6 py-3 bg-white/90 text-blue-600 font-semibold border-2 border-blue-400/40 rounded-xl 
          shadow-[0_0_12px_2px_rgba(59,130,246,0.3)] hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.35)] 
          hover:bg-blue-50/90 hover:border-blue-400/60 transition-all backdrop-blur
          flex items-center justify-center gap-3
       `,

     // Build Meal Plan with Pantry Items - Green with cyan shadow
     nutri_pantry_build: themeMode === 'dark'
       ? `
          py-3 px-4 bg-[#111827]/50 text-green-200 font-semibold border border-green-400/40 rounded-xl 
          shadow-[0_0_8px_1px_rgba(0,255,255,0.25)] hover:bg-[#1e293b]/60 transition-all backdrop-blur
          flex items-center justify-center gap-2
       `
       : `
          py-3 px-4 bg-white/90 text-green-600 font-semibold border border-green-400/40 rounded-xl 
          shadow-[0_0_8px_1px_rgba(0,255,255,0.25)] hover:bg-green-50/90 transition-all backdrop-blur
          flex items-center justify-center gap-2
       `,

     // Open Pantry - Blue with different shadow
     nutri_open_pantry: themeMode === 'dark'
       ? `
          px-4 py-2 bg-[#111827]/50 text-blue-200 font-semibold border border-blue-400/40 rounded-lg 
          shadow-[0_0_8px_1px_rgba(100,180,255,0.25)] hover:bg-[#1e293b]/60 transition-all
       `
       : `
          px-4 py-2 bg-white/90 text-blue-600 font-semibold border border-blue-400/40 rounded-lg 
          shadow-[0_0_8px_1px_rgba(100,180,255,0.25)] hover:bg-blue-50/90 transition-all
       `
  };
  
  return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]}`;
};

// =============================================================================
// CUSTOM NUTRI IQ BUTTON COMPONENT
// =============================================================================

const NutriIQButton = ({ 
  variant = 'nutri_primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  selected = false,
  children,
  className = '',
  ...props 
}) => {
  const { themeMode } = useTheme();
  
  const buttonStyles = getNutriIQButtonStyles(themeMode, variant, {
    size,
    fullWidth,
    disabled
  });
  
  return (
    <button
      className={`${buttonStyles} ${className}`}
      disabled={disabled}
      data-selected={selected}
      {...props}
    >
      {children}
    </button>
  );
};

// =============================================================================
// DEMO COMPONENT
// =============================================================================

const CustomNutriIQButtonsDemo = () => {
  const { themeMode } = useTheme();
  
  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold text-center mb-6">
        Your Actual Button Styles with Theme System
      </h2>
      <div className={themeMode === 'dark' 
        ? "text-center mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
        : "text-center mb-8 p-4 bg-blue-100 border border-blue-300 rounded-lg"
      }>
        <p className={themeMode === 'dark' ? "text-sm text-blue-300" : "text-sm text-blue-800"}>
          ✨ <strong>Enhanced Styling:</strong> Your buttons now have proper shadows, borders, and depth effects that match your actual Nutri IQ interface.
          <br />
          🎨 <strong>Theme Aware:</strong> Switch between light/dark modes to see how your buttons adapt while preserving their unique designs.
          <br />
          🔍 <strong>Light Mode Test:</strong> Toggle to light theme above to see how "Generate Your Meal Plan" (blue) and "View Recipe List" (emerald) look with light backgrounds!
        </p>
      </div>
      
      {/* Tab-style buttons (Report Card, Calendar View) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tab Navigation Buttons</h3>
        <div className="flex space-x-2">
          <NutriIQButton variant="nutri_primary" selected={true}>
            Report Card
          </NutriIQButton>
          <NutriIQButton variant="nutri_filter">
            Calendar View
          </NutriIQButton>
        </div>
      </div>
      
      {/* Meal type buttons */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Meal Type Buttons</h3>
        <div className="flex space-x-2">
          <NutriIQButton variant="nutri_meal" size="sm">
            Breakfast
          </NutriIQButton>
          <NutriIQButton variant="nutri_meal" size="sm">
            Lunch
          </NutriIQButton>
          <NutriIQButton variant="nutri_meal" size="sm">
            Dinner
          </NutriIQButton>
        </div>
      </div>
      
      {/* Time filter buttons */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Time Filter Buttons</h3>
        <div className="flex space-x-2">
          <NutriIQButton variant="nutri_filter" size="sm">
            Last Week
          </NutriIQButton>
          <NutriIQButton variant="nutri_filter" size="sm">
            Last Month
          </NutriIQButton>
          <NutriIQButton variant="nutri_filter" size="sm" selected={true}>
            All Time
          </NutriIQButton>
        </div>
      </div>
      
      {/* Your Exact Main Action Buttons */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">🎯 Your Exact Main Action Buttons</h3>
        <div className={themeMode === 'dark' 
          ? "bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4"
          : "bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4"
        }>
          <p className={themeMode === 'dark' ? "text-sm text-yellow-300" : "text-sm text-yellow-800"}>
            ⭐ These are the <strong>exact styling</strong> from your MealPlannerForm.jsx - same shadows, borders, animations, and responsive design.
            <br />
            💡 <strong>Toggle themes</strong> to see how they adapt to light mode while preserving their distinctive colors!
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <NutriIQButton variant="nutri_generate" fullWidth size="lg">
            Generate Your Meal Plan
          </NutriIQButton>
          <NutriIQButton variant="nutri_recipe_list" fullWidth size="lg">
            View Recipe List
          </NutriIQButton>
        </div>
      </div>

      {/* Fitness Integration Buttons */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">🏃‍♂️ Fitness Integration Buttons</h3>
        <div className={themeMode === 'dark' 
          ? "bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4"
          : "bg-blue-100 border border-blue-300 rounded-lg p-4 mb-4"
        }>
          <p className={themeMode === 'dark' ? "text-sm text-blue-300" : "text-sm text-blue-800"}>
            🎨 <strong>Brand-specific colors:</strong> Fitbit (teal) and Strava (orange) with your exact shadow and gradient styling.
          </p>
        </div>
        <div className="space-y-3">
          <NutriIQButton variant="nutri_fitbit" fullWidth>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
            </svg>
            Connect Fitbit
          </NutriIQButton>
          <NutriIQButton variant="nutri_strava" fullWidth>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Connect Strava
          </NutriIQButton>
        </div>
      </div>

      {/* Voice and Pantry Buttons */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">🎙️ Voice & Pantry Buttons</h3>
        <div className={themeMode === 'dark' 
          ? "bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4"
          : "bg-green-100 border border-green-300 rounded-lg p-4 mb-4"
        }>
          <p className={themeMode === 'dark' ? "text-sm text-green-300" : "text-sm text-green-800"}>
            🔊 <strong>Voice Intent:</strong> Blue styling for voice interaction<br/>
            🥬 <strong>Pantry Actions:</strong> Green with cyan shadow for pantry operations
          </p>
        </div>
        <div className="space-y-3">
          <NutriIQButton variant="nutri_voice" fullWidth>
            🎙️ Drive Your Meal Plan with Intent
          </NutriIQButton>
          <NutriIQButton variant="nutri_pantry_build" fullWidth>
            Build Meal Plan with Pantry Items
          </NutriIQButton>
          <div className="flex justify-end">
            <NutriIQButton variant="nutri_open_pantry">
              Open Pantry
            </NutriIQButton>
          </div>
        </div>
      </div>
      
      {/* Generic Action buttons */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">🔧 Generic Action Buttons</h3>
        <div className="space-y-3">
          <NutriIQButton variant="nutri_action" fullWidth>
            🎯 Generic Action Button
          </NutriIQButton>
          <div className="flex space-x-3">
            <NutriIQButton variant="nutri_card_action" fullWidth>
              Card Action 1
            </NutriIQButton>
            <NutriIQButton variant="nutri_card_action" fullWidth>
              Card Action 2
            </NutriIQButton>
          </div>
        </div>
      </div>
      
      {/* Size variations */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Size Variations</h3>
        <div className="flex items-center space-x-4">
          <NutriIQButton variant="nutri_primary" size="sm">
            Small
          </NutriIQButton>
          <NutriIQButton variant="nutri_primary" size="md">
            Medium
          </NutriIQButton>
          <NutriIQButton variant="nutri_primary" size="lg">
            Large
          </NutriIQButton>
        </div>
      </div>
    </div>
  );
};

export default CustomNutriIQButtonsDemo;
export { NutriIQButton, getNutriIQButtonStyles };

// Export individual button variants for easy integration
export const NUTRI_IQ_BUTTON_VARIANTS = {
  PRIMARY: 'nutri_primary',
  MEAL: 'nutri_meal', 
  FILTER: 'nutri_filter',
  ACTION: 'nutri_action',
  CARD_ACTION: 'nutri_card_action',
  GENERATE: 'nutri_generate',        // Generate Your Meal Plan (blue)
  RECIPE_LIST: 'nutri_recipe_list',  // View Recipe List (emerald)
  FITBIT: 'nutri_fitbit',           // Connect Fitbit (teal)
  STRAVA: 'nutri_strava',           // Connect Strava (orange) 
  VOICE: 'nutri_voice',             // Drive Your Meal Plan with Intent (voice)
  PANTRY_BUILD: 'nutri_pantry_build', // Build Meal Plan with Pantry Items (green)
  OPEN_PANTRY: 'nutri_open_pantry'  // Open Pantry (blue)
}; 