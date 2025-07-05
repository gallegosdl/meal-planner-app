/**
 * @fileoverview Theme Context Provider for Nutri IQ
 * @version 1.0.0
 * @author Nutri IQ Team
 * 
 * Features:
 * - Theme state management
 * - Local storage persistence
 * - System preference detection
 * - Performance optimizations
 * - Type safety preparation
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { THEME_MODES, getTheme, getSystemTheme, isValidThemeMode } from '../styles/themes.js';
import { clearStyleCache } from '../utils/styleUtils.js';

// =============================================================================
// CONTEXT DEFINITION
// =============================================================================

const ThemeContext = createContext(null);

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'nutri-iq-theme';
const DEFAULT_THEME = THEME_MODES.DARK;

// =============================================================================
// THEME PROVIDER COMPONENT
// =============================================================================

/**
 * Theme Provider Component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.defaultTheme - Default theme mode
 * @param {boolean} props.enableSystemDetection - Enable system theme detection
 * @param {Function} props.onThemeChange - Theme change callback
 * @returns {JSX.Element} Theme provider component
 */
export const ThemeProvider = ({ 
  children, 
  defaultTheme = DEFAULT_THEME,
  enableSystemDetection = true,
  onThemeChange = null
}) => {
  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================
  
  const [themeMode, setThemeMode] = useState(() => {
    // SSR safety check
    if (typeof window === 'undefined') return defaultTheme;
    
    try {
      // Try to get theme from localStorage
      const savedTheme = localStorage.getItem(STORAGE_KEY);
      if (savedTheme && isValidThemeMode(savedTheme)) {
        return savedTheme;
      }
      
      // Fall back to system preference if enabled
      if (enableSystemDetection) {
        return getSystemTheme();
      }
      
      return defaultTheme;
    } catch (error) {
      console.warn('Error reading theme from localStorage:', error);
      return defaultTheme;
    }
  });
  
  const [isSystemTheme, setIsSystemTheme] = useState(false);
  
  // =============================================================================
  // DERIVED STATE
  // =============================================================================
  
  const currentTheme = useMemo(() => getTheme(themeMode), [themeMode]);
  const isDarkMode = themeMode === THEME_MODES.DARK;
  const isLightMode = themeMode === THEME_MODES.LIGHT;
  
  // =============================================================================
  // THEME ACTIONS
  // =============================================================================
  
  /**
   * Set theme mode with persistence
   * @param {string} mode - Theme mode to set
   * @param {boolean} persist - Whether to persist to localStorage
   */
  const setTheme = useCallback((mode, persist = true) => {
    if (!isValidThemeMode(mode)) {
      console.warn(`Invalid theme mode: ${mode}`);
      return;
    }
    
    setThemeMode(mode);
    setIsSystemTheme(false);
    
    if (persist && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch (error) {
        console.warn('Error saving theme to localStorage:', error);
      }
    }
    
    // Clear style cache when theme changes
    clearStyleCache();
    
    // Call theme change callback
    if (onThemeChange) {
      onThemeChange(mode);
    }
  }, [onThemeChange]);
  
  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = useCallback(() => {
    const newMode = isDarkMode ? THEME_MODES.LIGHT : THEME_MODES.DARK;
    setTheme(newMode);
  }, [isDarkMode, setTheme]);
  
  /**
   * Set theme to system preference
   */
  const setSystemTheme = useCallback(() => {
    const systemMode = getSystemTheme();
    setThemeMode(systemMode);
    setIsSystemTheme(true);
    
    // Remove from localStorage to indicate system preference
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Error removing theme from localStorage:', error);
      }
    }
    
    clearStyleCache();
    
    if (onThemeChange) {
      onThemeChange(systemMode);
    }
  }, [onThemeChange]);
  
  /**
   * Reset theme to default
   */
  const resetTheme = useCallback(() => {
    setTheme(defaultTheme);
  }, [defaultTheme, setTheme]);
  
  // =============================================================================
  // EFFECTS
  // =============================================================================
  
  // Apply theme to document
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('dark', 'light');
    
    // Add current theme class
    root.classList.add(themeMode);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const backgroundColor = isDarkMode ? '#1a1f2b' : '#ffffff';
      metaThemeColor.setAttribute('content', backgroundColor);
    }
    
    // Update favicon if needed (optional)
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon && favicon.href) {
      // You can implement favicon switching logic here if needed
    }
    
  }, [themeMode, isDarkMode]);
  
  // Listen for system theme changes
  useEffect(() => {
    if (!enableSystemDetection || !isSystemTheme) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      const newSystemMode = e.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT;
      setThemeMode(newSystemMode);
      
      if (onThemeChange) {
        onThemeChange(newSystemMode);
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [enableSystemDetection, isSystemTheme, onThemeChange]);
  
  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================
  
  const contextValue = useMemo(() => ({
    // Current state
    themeMode,
    currentTheme,
    isDarkMode,
    isLightMode,
    isSystemTheme,
    
    // Actions
    setTheme,
    toggleTheme,
    setSystemTheme,
    resetTheme,
    
    // Utilities
    getTheme,
    isValidThemeMode,
    availableThemes: Object.values(THEME_MODES).filter(mode => mode !== THEME_MODES.AUTO)
  }), [
    themeMode,
    currentTheme,
    isDarkMode,
    isLightMode,
    isSystemTheme,
    setTheme,
    toggleTheme,
    setSystemTheme,
    resetTheme
  ]);
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// =============================================================================
// CUSTOM HOOKS
// =============================================================================

/**
 * Hook to access theme context
 * @returns {Object} Theme context value
 * @throws {Error} If used outside of ThemeProvider
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

/**
 * Hook to get current theme mode only
 * @returns {string} Current theme mode
 */
export const useThemeMode = () => {
  const { themeMode } = useTheme();
  return themeMode;
};

/**
 * Hook to get theme toggle function
 * @returns {Function} Theme toggle function
 */
export const useThemeToggle = () => {
  const { toggleTheme } = useTheme();
  return toggleTheme;
};

/**
 * Hook to get current theme object
 * @returns {Object} Current theme object
 */
export const useCurrentTheme = () => {
  const { currentTheme } = useTheme();
  return currentTheme;
};

/**
 * Hook to check if current theme is dark
 * @returns {boolean} Is dark mode
 */
export const useIsDarkMode = () => {
  const { isDarkMode } = useTheme();
  return isDarkMode;
};

// =============================================================================
// HIGHER-ORDER COMPONENTS
// =============================================================================

/**
 * HOC to provide theme context to components
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Wrapped component with theme context
 */
export const withTheme = (Component) => {
  const WrappedComponent = (props) => {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
  
  WrappedComponent.displayName = `withTheme(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get theme context value (for use outside of React components)
 * @param {HTMLElement} element - Element to check for theme class
 * @returns {string} Current theme mode
 */
export const getThemeFromDOM = (element = document.documentElement) => {
  if (element.classList.contains('dark')) return THEME_MODES.DARK;
  if (element.classList.contains('light')) return THEME_MODES.LIGHT;
  return DEFAULT_THEME;
};

/**
 * Check if theme preference is set in localStorage
 * @returns {boolean} Has stored theme preference
 */
export const hasStoredThemePreference = () => {
  if (typeof window === 'undefined') return false;
  
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    return false;
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

export default ThemeProvider; 