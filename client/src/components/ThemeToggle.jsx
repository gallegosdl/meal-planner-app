/**
 * @fileoverview Modern Theme Toggle Component
 * @version 1.0.0
 * @author Nutri IQ Team
 * 
 * Features:
 * - Smooth animations
 * - Accessibility support
 * - Modern design patterns
 * - Customizable appearance
 * - Keyboard navigation
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { THEME_MODES } from '../styles/themes.js';

// =============================================================================
// ICONS
// =============================================================================

const SunIcon = ({ className = "w-4 h-4" }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const MoonIcon = ({ className = "w-4 h-4" }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

const SystemIcon = ({ className = "w-4 h-4" }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

// =============================================================================
// THEME TOGGLE COMPONENT
// =============================================================================

/**
 * Theme Toggle Component
 * @param {Object} props - Component props
 * @param {string} props.variant - Toggle variant ('switch' | 'button' | 'dropdown')
 * @param {string} props.size - Toggle size ('sm' | 'md' | 'lg')
 * @param {string} props.position - Toggle position ('left' | 'right' | 'center')
 * @param {boolean} props.showLabel - Show text label
 * @param {boolean} props.showIcons - Show theme icons
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onToggle - Toggle callback
 * @returns {JSX.Element} Theme toggle component
 */
export const ThemeToggle = ({
  variant = 'switch',
  size = 'md',
  position = 'right',
  showLabel = false,
  showIcons = true,
  className = '',
  onToggle = null
}) => {
  const { 
    themeMode, 
    isDarkMode, 
    isLightMode, 
    toggleTheme, 
    setTheme,
    setSystemTheme,
    isSystemTheme 
  } = useTheme();
  
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // =============================================================================
  // HANDLERS
  // =============================================================================
  
  const handleToggle = () => {
    if (variant === 'switch') {
      toggleTheme();
    } else if (variant === 'dropdown') {
      setShowDropdown(!showDropdown);
    } else {
      toggleTheme();
    }
    
    if (onToggle) {
      onToggle();
    }
  };
  
  const handleThemeSelect = (mode) => {
    if (mode === 'system') {
      setSystemTheme();
    } else {
      setTheme(mode);
    }
    setShowDropdown(false);
    
    if (onToggle) {
      onToggle();
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };
  
  // =============================================================================
  // EFFECTS
  // =============================================================================
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDropdown && !e.target.closest('.theme-toggle-dropdown')) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);
  
  // =============================================================================
  // STYLES
  // =============================================================================
  
  const getSizeClasses = () => {
    const sizes = {
      sm: {
        container: 'w-10 h-5',
        thumb: 'w-4 h-4',
        icon: 'w-3 h-3',
        text: 'text-xs'
      },
      md: {
        container: 'w-12 h-6',
        thumb: 'w-5 h-5',
        icon: 'w-4 h-4',
        text: 'text-sm'
      },
      lg: {
        container: 'w-14 h-7',
        thumb: 'w-6 h-6',
        icon: 'w-5 h-5',
        text: 'text-base'
      }
    };
    
    return sizes[size] || sizes.md;
  };
  
  const getPositionClasses = () => {
    const positions = {
      left: 'flex-row',
      right: 'flex-row-reverse',
      center: 'flex-col items-center'
    };
    
    return positions[position] || positions.right;
  };
  
  const sizeClasses = getSizeClasses();
  const positionClasses = getPositionClasses();
  
  // =============================================================================
  // RENDER METHODS
  // =============================================================================
  
  const renderSwitchToggle = () => {
    const baseClasses = `
      relative inline-flex items-center cursor-pointer
      rounded-full transition-all duration-300 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      ${sizeClasses.container}
      ${isDarkMode 
        ? 'bg-blue-600 shadow-[0_0_0_1px_rgba(59,130,246,0.6)]' 
        : 'bg-gray-200 shadow-inner'
      }
      ${isHovered || isFocused ? 'scale-105' : ''}
      ${className}
    `;
    
    const getThumbTranslate = () => {
      if (!isDarkMode) return 'translate-x-0';
      
      switch (size) {
        case 'sm': return 'translate-x-5';
        case 'lg': return 'translate-x-7';
        default: return 'translate-x-6';
      }
    };
    
    const thumbClasses = `
      absolute top-0.5 left-0.5 
      flex items-center justify-center
      bg-white rounded-full shadow-lg
      transition-all duration-300 ease-in-out
      ${sizeClasses.thumb}
      ${getThumbTranslate()}
    `;
    
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDarkMode}
        aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        className={baseClasses}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <span className={thumbClasses}>
          {showIcons && (
            <div className={`transition-all duration-300 ${isDarkMode ? 'text-blue-600' : 'text-yellow-500'}`}>
              {isDarkMode ? (
                <MoonIcon className={sizeClasses.icon} />
              ) : (
                <SunIcon className={sizeClasses.icon} />
              )}
            </div>
          )}
        </span>
        
        {/* Screen reader text */}
        <span className="sr-only">
          {isDarkMode ? 'Dark mode enabled' : 'Light mode enabled'}
        </span>
      </button>
    );
  };
  
  const renderButtonToggle = () => {
    const baseClasses = `
      inline-flex items-center justify-center
      px-3 py-2 rounded-lg font-medium
      transition-all duration-300 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      ${isDarkMode 
        ? 'bg-gray-700 text-white hover:bg-gray-600' 
        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
      }
      ${isHovered || isFocused ? 'scale-105' : ''}
      ${className}
    `;
    
    return (
      <button
        type="button"
        aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        className={baseClasses}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        {showIcons && (
          <span className="mr-2">
            {isDarkMode ? (
              <MoonIcon className={sizeClasses.icon} />
            ) : (
              <SunIcon className={sizeClasses.icon} />
            )}
          </span>
        )}
        
        {showLabel && (
          <span className={sizeClasses.text}>
            {isDarkMode ? 'Dark' : 'Light'}
          </span>
        )}
      </button>
    );
  };
  
  const renderDropdownToggle = () => {
    const themes = [
      { key: 'light', label: 'Light', icon: SunIcon },
      { key: 'dark', label: 'Dark', icon: MoonIcon },
      { key: 'system', label: 'System', icon: SystemIcon }
    ];
    
    const getCurrentTheme = () => {
      if (isSystemTheme) return themes.find(t => t.key === 'system');
      return themes.find(t => t.key === themeMode);
    };
    
    const currentTheme = getCurrentTheme();
    
    return (
      <div className={`relative theme-toggle-dropdown ${className}`}>
        <button
          type="button"
          aria-label="Select theme"
          aria-haspopup="true"
          aria-expanded={showDropdown}
          className={`
            inline-flex items-center justify-center
            px-3 py-2 rounded-lg font-medium
            transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isDarkMode 
              ? 'bg-gray-700 text-white hover:bg-gray-600' 
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }
            ${isHovered || isFocused ? 'scale-105' : ''}
          `}
          onClick={handleToggle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          {showIcons && currentTheme && (
            <currentTheme.icon className={`${sizeClasses.icon} mr-2`} />
          )}
          
          {showLabel && (
            <span className={sizeClasses.text}>
              {currentTheme?.label || 'Theme'}
            </span>
          )}
          
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showDropdown && (
          <div className={`
            absolute top-full mt-2 right-0 z-50
            min-w-[140px] py-2 rounded-lg shadow-lg border
            ${isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
            }
            animate-in fade-in duration-200
          `}>
            {themes.map((theme) => (
              <button
                key={theme.key}
                type="button"
                className={`
                  w-full px-4 py-2 text-left
                  flex items-center transition-colors
                  ${isDarkMode 
                    ? 'hover:bg-gray-700 text-white' 
                    : 'hover:bg-gray-100 text-gray-900'
                  }
                  ${((theme.key === themeMode && !isSystemTheme) || 
                     (theme.key === 'system' && isSystemTheme)) 
                    ? (isDarkMode ? 'bg-blue-600/20' : 'bg-blue-100') 
                    : ''
                  }
                `}
                onClick={() => handleThemeSelect(theme.key)}
              >
                <theme.icon className={`${sizeClasses.icon} mr-3`} />
                <span className={sizeClasses.text}>{theme.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  // =============================================================================
  // MAIN RENDER
  // =============================================================================
  
  const renderToggle = () => {
    switch (variant) {
      case 'button':
        return renderButtonToggle();
      case 'dropdown':
        return renderDropdownToggle();
      case 'switch':
      default:
        return renderSwitchToggle();
    }
  };
  
  return (
    <div className={`flex items-center gap-3 ${positionClasses}`}>
      {showLabel && position === 'left' && (
        <span className={`${sizeClasses.text} ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Theme
        </span>
      )}
      
      {renderToggle()}
      
      {showLabel && position === 'right' && (
        <span className={`${sizeClasses.text} ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {isDarkMode ? 'Dark' : 'Light'}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export default ThemeToggle; 