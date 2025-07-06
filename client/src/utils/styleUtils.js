/**
 * @fileoverview Style utility functions for theme-aware styling
 * @version 1.0.0
 * @author Nutri IQ Team
 * 
 * Cross-platform style utilities designed for:
 * - Web (Tailwind CSS classes)
 * - Future React Native (style objects)
 * - Component-based architecture
 * - Performance optimization
 */

import { getTheme, THEME_MODES, foundations } from '../styles/themes.js';

// =============================================================================
// UTILITY CONSTANTS
// =============================================================================

const COMPONENT_TYPES = Object.freeze({
  CARD: 'card',
  BUTTON: 'button',
  INPUT: 'input',
  TEXT: 'text',
  TAG: 'tag',
  MODAL: 'modal',
  CONTAINER: 'container'
});

const BUTTON_VARIANTS = Object.freeze({
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  GHOST: 'ghost',
  DANGER: 'danger',
  PANTRY_OPEN: 'pantry_open',
  PANTRY_BUILD: 'pantry_build',
  MEAL_PLAN_GENERATE: 'meal_plan_generate',
  RECIPE_LIST_VIEW: 'recipe_list_view',
  VOICE_INTENT: 'voice_intent',
  VOICE_INTENT_ACTIVE: 'voice_intent_active',
  FITBIT_CONNECT: 'fitbit_connect',
  STRAVA_CONNECT: 'strava_connect'
});

const TEXT_VARIANTS = Object.freeze({
  HEADING: 'heading',
  BODY: 'body',
  CAPTION: 'caption',
  LABEL: 'label'
});

const TAG_VARIANTS = Object.freeze({
  BLUE: 'blue',
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
  GRAY: 'gray'
});

// =============================================================================
// CORE STYLE GENERATORS
// =============================================================================

/**
 * Generate base transition classes
 * @param {string} duration - Animation duration
 * @returns {string} Transition classes
 */
export const getTransitionClasses = (duration = 'NORMAL') => {
  const durationValue = foundations.animation?.[duration] || '300ms';
  return `transition-all duration-300 ease-in-out`;
};

/**
 * Generate card component styles
 * @param {string} themeMode - Current theme mode
 * @param {string} variant - Card variant (base, elevated, interactive, subtle)
 * @param {Object} options - Additional options
 * @returns {string} Card CSS classes
 */
export const getCardStyles = (themeMode = THEME_MODES.DARK, variant = 'base', options = {}) => {
  const theme = getTheme(themeMode);
  const { layout = '', additionalClasses = '' } = options;
  
  // Get the complete card styles from theme (includes all styling)
  const cardStyles = theme.components.card[variant] || theme.components.card.base;
  
  // Add layout utilities if specified
  const layoutStyles = layout && theme.components.card.layout[layout] 
    ? theme.components.card.layout[layout] 
    : '';
  
  return `${cardStyles} ${layoutStyles} ${additionalClasses}`.trim();
};

/**
 * Generate button component styles
 * @param {string} themeMode - Current theme mode
 * @param {string} variant - Button variant
 * @param {Object} options - Additional options
 * @returns {string} Button CSS classes
 */
export const getButtonStyles = (
  themeMode = THEME_MODES.DARK, 
  variant = BUTTON_VARIANTS.PRIMARY,
  options = {}
) => {
  const theme = getTheme(themeMode);
  const { size = 'md', fullWidth = false, disabled = false } = options;
  
  // Base button styles
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  // Variant styles
  const variantStyles = theme.components.button[variant] || theme.components.button.primary;
  
  // Additional styles
  const widthStyles = fullWidth ? 'w-full' : '';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  const transitionStyles = getTransitionClasses();
  
  return `${baseStyles} ${sizeStyles[size]} ${variantStyles} ${widthStyles} ${disabledStyles} ${transitionStyles}`.trim();
};

/**
 * Generate input component styles
 * @param {string} themeMode - Current theme mode
 * @param {Object} options - Additional options
 * @returns {string} Input CSS classes
 */
export const getInputStyles = (themeMode = THEME_MODES.DARK, options = {}) => {
  const theme = getTheme(themeMode);
  const { size = 'md', hasError = false, fullWidth = true } = options;
  
  // Base input styles
  const baseStyles = 'rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-0';
  
  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-4 py-3 text-lg'
  };
  
  // Theme styles
  const themeStyles = `${theme.components.input.base} ${theme.components.input.focus}`;
  
  // Error styles
  const errorStyles = hasError ? 'border-red-500 focus:ring-red-500' : '';
  
  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';
  
  const transitionStyles = getTransitionClasses();
  
  return `${baseStyles} ${sizeStyles[size]} ${themeStyles} ${errorStyles} ${widthStyles} ${transitionStyles}`.trim();
};

/**
 * Generate text styles
 * @param {string} themeMode - Current theme mode
 * @param {string} variant - Text variant
 * @param {Object} options - Additional options
 * @returns {string} Text CSS classes
 */
export const getTextStyles = (
  themeMode = THEME_MODES.DARK,
  variant = TEXT_VARIANTS.BODY,
  options = {}
) => {
  const theme = getTheme(themeMode);
  const { weight = 'normal', align = 'left', truncate = false } = options;
  
  // Variant styles mapping
  const variantStyles = {
    [TEXT_VARIANTS.HEADING]: `text-xl font-semibold ${theme.text.primary}`,
    [TEXT_VARIANTS.BODY]: `text-base font-normal ${theme.text.secondary}`,
    [TEXT_VARIANTS.CAPTION]: `text-sm font-normal ${theme.text.tertiary}`,
    [TEXT_VARIANTS.LABEL]: `text-sm font-medium ${theme.text.primary}`
  };
  
  // Weight styles
  const weightStyles = `font-${weight}`;
  
  // Alignment styles
  const alignStyles = `text-${align}`;
  
  // Truncation styles
  const truncateStyles = truncate ? 'truncate' : '';
  
  const baseVariantStyle = variantStyles[variant] || variantStyles[TEXT_VARIANTS.BODY];
  
  return `${baseVariantStyle} ${weightStyles} ${alignStyles} ${truncateStyles}`.trim();
};

/**
 * Generate tag/badge styles
 * @param {string} themeMode - Current theme mode
 * @param {string} variant - Tag color variant
 * @param {Object} options - Additional options
 * @returns {string} Tag CSS classes
 */
export const getTagStyles = (
  themeMode = THEME_MODES.DARK,
  variant = TAG_VARIANTS.BLUE,
  options = {}
) => {
  const theme = getTheme(themeMode);
  const { size = 'md', removable = false } = options;
  
  // Base tag styles
  const baseStyles = 'inline-flex items-center rounded-full font-medium';
  
  // Size styles
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  // Color variant styles
  const variantStyles = theme.components.tag[variant] || theme.components.tag.blue;
  
  // Removable styles
  const removableStyles = removable ? 'pr-1' : '';
  
  const transitionStyles = getTransitionClasses();
  
  return `${baseStyles} ${sizeStyles[size]} ${variantStyles} ${removableStyles} ${transitionStyles}`.trim();
};

/**
 * Generate container styles
 * @param {string} themeMode - Current theme mode
 * @param {Object} options - Container options
 * @returns {string} Container CSS classes
 */
export const getContainerStyles = (themeMode = THEME_MODES.DARK, options = {}) => {
  const theme = getTheme(themeMode);
  const { 
    maxWidth = '1400px',
    padding = true,
    centered = true,
    fullHeight = false 
  } = options;
  
  // Base container styles
  const baseStyles = fullHeight ? 'min-h-screen' : '';
  
  // Background styles
  const backgroundStyles = theme.backgrounds.primary.gradient;
  
  // Width and centering
  const widthStyles = centered ? 'mx-auto' : '';
  const maxWidthStyles = `max-w-[${maxWidth}]`;
  
  // Padding styles
  const paddingStyles = padding ? 'p-3 sm:p-6' : '';
  
  // Text color
  const textStyles = theme.text.primary;
  
  const transitionStyles = getTransitionClasses();
  
  return `${baseStyles} ${backgroundStyles} ${widthStyles} ${maxWidthStyles} ${paddingStyles} ${textStyles} ${transitionStyles}`.trim();
};

/**
 * Generate modal styles
 * @param {string} themeMode - Current theme mode
 * @param {Object} options - Modal options
 * @returns {Object} Modal style object with overlay and content
 */
export const getModalStyles = (themeMode = THEME_MODES.DARK, options = {}) => {
  const theme = getTheme(themeMode);
  const { size = 'md', centered = true } = options;
  
  // Size configurations
  const sizeConfigs = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };
  
  return {
    overlay: `fixed inset-0 z-50 flex items-center justify-center p-4 ${theme.backgrounds.surface.overlay}`,
    content: `
      ${theme.backgrounds.secondary.solid} 
      ${theme.borders.primary} 
      ${theme.text.primary}
      rounded-2xl 
      p-8 
      ${sizeConfigs[size]} 
      w-full 
      border 
      shadow-xl
      ${getTransitionClasses()}
    `.replace(/\s+/g, ' ').trim()
  };
};

/**
 * Generate header component styles
 * @param {string} themeMode - Current theme mode
 * @param {string} element - Header element variant
 * @param {Object} options - Additional options
 * @returns {string} Header CSS classes
 */
export const getHeaderStyles = (
  themeMode = THEME_MODES.DARK,
  element = 'container',
  options = {}
) => {
  const theme = getTheme(themeMode);
  const { additionalClasses = '' } = options;
  
  // Get header styles from theme, fallback to container if element not found
  const headerStyles = theme.components.header?.[element] || theme.components.header?.container || '';
  
  return `${headerStyles} ${additionalClasses}`.trim();
};

// =============================================================================
// COMPOSITE STYLE GENERATORS
// =============================================================================

/**
 * Generate complete component styles for common UI patterns
 * @param {string} themeMode - Current theme mode
 * @returns {Object} Object containing all component style functions
 */
export const getComponentStyles = (themeMode = THEME_MODES.DARK) => {
  const theme = getTheme(themeMode);
  
  return {
    // Layout components
    container: (options = {}) => getContainerStyles(themeMode, options),
    card: (variant = 'base') => getCardStyles(themeMode, variant),
    modal: (options = {}) => getModalStyles(themeMode, options),
    
    // Interactive components
    button: (variant = BUTTON_VARIANTS.PRIMARY, options = {}) => 
      getButtonStyles(themeMode, variant, options),
    input: (options = {}) => getInputStyles(themeMode, options),
    
    // Typography components
    text: (variant = TEXT_VARIANTS.BODY, options = {}) => 
      getTextStyles(themeMode, variant, options),
    heading: (options = {}) => getTextStyles(themeMode, TEXT_VARIANTS.HEADING, options),
    
    // Data display components
    tag: (variant = TAG_VARIANTS.BLUE, options = {}) => 
      getTagStyles(themeMode, variant, options),
    
    // Raw theme access
    theme
  };
};

/**
 * Create a style hook for React components
 * @param {string} themeMode - Current theme mode
 * @returns {Object} Style utilities object
 */
export const createStyleUtils = (themeMode = THEME_MODES.DARK) => {
  return {
    ...getComponentStyles(themeMode),
    
    // Utility functions
    getTheme: () => getTheme(themeMode),
    combineClasses: (...classes) => classes.filter(Boolean).join(' '),
    conditionalClass: (condition, trueClass, falseClass = '') => 
      condition ? trueClass : falseClass
  };
};

// =============================================================================
// PERFORMANCE OPTIMIZATIONS
// =============================================================================

// Memoization cache for frequently used styles
const styleCache = new Map();

/**
 * Memoized style generator for performance
 * @param {string} key - Cache key
 * @param {Function} generator - Style generator function
 * @returns {string} Generated styles
 */
export const memoizedStyles = (key, generator) => {
  if (styleCache.has(key)) {
    return styleCache.get(key);
  }
  
  const styles = generator();
  styleCache.set(key, styles);
  return styles;
};

/**
 * Clear style cache (useful for theme changes)
 */
export const clearStyleCache = () => {
  styleCache.clear();
};

/**
 * Quick utility for the common card pattern used throughout the app
 * @param {string} themeMode - Current theme mode
 * @param {Object} options - Additional options
 * @returns {string} Complete card CSS classes
 */
export const getCommonCardStyles = (themeMode = THEME_MODES.DARK, options = {}) => {
  const { 
    layout = 'full', // 'full', 'flexCol', 'flexRow', 'center', ''
    variant = 'base', // 'base', 'elevated', 'interactive', 'subtle'
    additionalClasses = '' 
  } = options;
  
  return getCardStyles(themeMode, variant, { layout, additionalClasses });
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  COMPONENT_TYPES,
  BUTTON_VARIANTS,
  TEXT_VARIANTS,
  TAG_VARIANTS
};

export default getComponentStyles; 