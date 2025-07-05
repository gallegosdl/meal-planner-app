/**
 * @fileoverview Type definitions and constants for theme system
 * @version 1.0.0
 * @author Nutri IQ Team
 * 
 * Purpose:
 * - Type safety for JavaScript development
 * - Future TypeScript migration preparation
 * - IDE IntelliSense support
 * - Documentation for developers
 */

// =============================================================================
// THEME TYPE DEFINITIONS
// =============================================================================

/**
 * @typedef {Object} ThemeMode
 * @property {string} DARK - Dark theme mode
 * @property {string} LIGHT - Light theme mode
 * @property {string} AUTO - System automatic theme mode
 */

/**
 * @typedef {Object} ColorPalette
 * @property {Object} brand - Brand colors
 * @property {string} brand.primary - Primary brand color
 * @property {string} brand.secondary - Secondary brand color
 * @property {string} brand.accent - Accent brand color
 * @property {string} brand.muted - Muted brand color
 * @property {Object} semantic - Semantic colors
 * @property {string} semantic.success - Success color
 * @property {string} semantic.warning - Warning color
 * @property {string} semantic.error - Error color
 * @property {string} semantic.info - Info color
 */

/**
 * @typedef {Object} Typography
 * @property {Object} fontFamilies - Font family definitions
 * @property {string[]} fontFamilies.sans - Sans-serif font stack
 * @property {string[]} fontFamilies.mono - Monospace font stack
 * @property {Object} fontSizes - Font size scale
 * @property {string} fontSizes.xs - Extra small font size
 * @property {string} fontSizes.sm - Small font size
 * @property {string} fontSizes.base - Base font size
 * @property {string} fontSizes.lg - Large font size
 * @property {string} fontSizes.xl - Extra large font size
 * @property {Object} fontWeights - Font weight scale
 * @property {string} fontWeights.normal - Normal font weight
 * @property {string} fontWeights.medium - Medium font weight
 * @property {string} fontWeights.semibold - Semibold font weight
 * @property {string} fontWeights.bold - Bold font weight
 * @property {Object} lineHeights - Line height scale
 * @property {string} lineHeights.tight - Tight line height
 * @property {string} lineHeights.normal - Normal line height
 * @property {string} lineHeights.relaxed - Relaxed line height
 */

/**
 * @typedef {Object} ThemeColors
 * @property {Object} backgrounds - Background color definitions
 * @property {Object} backgrounds.primary - Primary background colors
 * @property {string} backgrounds.primary.gradient - Primary gradient background
 * @property {string} backgrounds.primary.solid - Primary solid background
 * @property {Object} backgrounds.secondary - Secondary background colors
 * @property {string} backgrounds.secondary.translucent - Translucent secondary background
 * @property {string} backgrounds.secondary.solid - Solid secondary background
 * @property {string} backgrounds.secondary.elevated - Elevated secondary background
 * @property {Object} text - Text color definitions
 * @property {string} text.primary - Primary text color
 * @property {string} text.secondary - Secondary text color
 * @property {string} text.tertiary - Tertiary text color
 * @property {string} text.muted - Muted text color
 * @property {string} text.inverse - Inverse text color
 * @property {string} text.accent - Accent text color
 * @property {Object} borders - Border color definitions
 * @property {string} borders.primary - Primary border color
 * @property {string} borders.secondary - Secondary border color
 * @property {string} borders.accent - Accent border color
 * @property {string} borders.transparent - Transparent border color
 */

/**
 * @typedef {Object} ComponentStyles
 * @property {Object} card - Card component styles
 * @property {string} card.base - Base card styles
 * @property {string} card.elevated - Elevated card styles
 * @property {string} card.interactive - Interactive card styles
 * @property {Object} button - Button component styles
 * @property {string} button.primary - Primary button styles
 * @property {string} button.secondary - Secondary button styles
 * @property {string} button.ghost - Ghost button styles
 * @property {Object} input - Input component styles
 * @property {string} input.base - Base input styles
 * @property {string} input.focus - Focus input styles
 * @property {Object} tag - Tag component styles
 * @property {string} tag.blue - Blue tag styles
 * @property {string} tag.green - Green tag styles
 * @property {string} tag.yellow - Yellow tag styles
 * @property {string} tag.red - Red tag styles
 */

/**
 * @typedef {Object} Theme
 * @property {string} mode - Theme mode
 * @property {ThemeColors} backgrounds - Background colors
 * @property {ThemeColors} text - Text colors
 * @property {ThemeColors} borders - Border colors
 * @property {ComponentStyles} components - Component styles
 */

/**
 * @typedef {Object} ThemeContextValue
 * @property {string} themeMode - Current theme mode
 * @property {Theme} currentTheme - Current theme object
 * @property {boolean} isDarkMode - Is dark mode active
 * @property {boolean} isLightMode - Is light mode active
 * @property {boolean} isSystemTheme - Is using system theme
 * @property {Function} setTheme - Set theme function
 * @property {Function} toggleTheme - Toggle theme function
 * @property {Function} setSystemTheme - Set system theme function
 * @property {Function} resetTheme - Reset theme function
 * @property {Function} getTheme - Get theme function
 * @property {Function} isValidThemeMode - Validate theme mode function
 * @property {string[]} availableThemes - Available theme modes
 */

// =============================================================================
// COMPONENT PROP TYPES
// =============================================================================

/**
 * @typedef {Object} ThemeProviderProps
 * @property {React.ReactNode} children - Child components
 * @property {string} [defaultTheme] - Default theme mode
 * @property {boolean} [enableSystemDetection] - Enable system theme detection
 * @property {Function} [onThemeChange] - Theme change callback
 */

/**
 * @typedef {Object} ThemeToggleProps
 * @property {'switch'|'button'|'dropdown'} [variant] - Toggle variant
 * @property {'sm'|'md'|'lg'} [size] - Toggle size
 * @property {'left'|'right'|'center'} [position] - Toggle position
 * @property {boolean} [showLabel] - Show text label
 * @property {boolean} [showIcons] - Show theme icons
 * @property {string} [className] - Additional CSS classes
 * @property {Function} [onToggle] - Toggle callback
 */

/**
 * @typedef {Object} StyleUtilsOptions
 * @property {string} [size] - Component size
 * @property {boolean} [fullWidth] - Full width component
 * @property {boolean} [disabled] - Disabled state
 * @property {boolean} [hasError] - Error state
 * @property {string} [weight] - Font weight
 * @property {string} [align] - Text alignment
 * @property {boolean} [truncate] - Truncate text
 * @property {boolean} [removable] - Removable tag
 * @property {string} [maxWidth] - Maximum width
 * @property {boolean} [padding] - Include padding
 * @property {boolean} [centered] - Center content
 * @property {boolean} [fullHeight] - Full height
 */

// =============================================================================
// STYLE UTILITIES TYPES
// =============================================================================

/**
 * @typedef {Object} StyleUtilsReturn
 * @property {Function} container - Container styles function
 * @property {Function} card - Card styles function
 * @property {Function} modal - Modal styles function
 * @property {Function} button - Button styles function
 * @property {Function} input - Input styles function
 * @property {Function} text - Text styles function
 * @property {Function} heading - Heading styles function
 * @property {Function} tag - Tag styles function
 * @property {Theme} theme - Current theme object
 * @property {Function} getTheme - Get theme function
 * @property {Function} combineClasses - Combine CSS classes
 * @property {Function} conditionalClass - Conditional CSS class
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Component variant constants
 * @type {Object}
 */
export const COMPONENT_VARIANTS = Object.freeze({
  BUTTON: {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    GHOST: 'ghost',
    DANGER: 'danger'
  },
  TEXT: {
    HEADING: 'heading',
    BODY: 'body',
    CAPTION: 'caption',
    LABEL: 'label'
  },
  TAG: {
    BLUE: 'blue',
    GREEN: 'green',
    YELLOW: 'yellow',
    RED: 'red',
    GRAY: 'gray'
  },
  TOGGLE: {
    SWITCH: 'switch',
    BUTTON: 'button',
    DROPDOWN: 'dropdown'
  }
});

/**
 * Size constants
 * @type {Object}
 */
export const SIZES = Object.freeze({
  XS: 'xs',
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl'
});

/**
 * Animation duration constants
 * @type {Object}
 */
export const ANIMATION_DURATIONS = Object.freeze({
  FAST: '150ms',
  NORMAL: '300ms',
  SLOW: '500ms'
});

/**
 * Breakpoint constants
 * @type {Object}
 */
export const BREAKPOINTS = Object.freeze({
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px'
});

/**
 * Z-index constants
 * @type {Object}
 */
export const Z_INDEX = Object.freeze({
  DROPDOWN: 10,
  MODAL: 50,
  TOOLTIP: 60,
  NOTIFICATION: 70
});

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate theme mode
 * @param {string} mode - Theme mode to validate
 * @returns {boolean} Is valid theme mode
 */
export const validateThemeMode = (mode) => {
  return ['dark', 'light', 'auto'].includes(mode);
};

/**
 * Validate component size
 * @param {string} size - Size to validate
 * @returns {boolean} Is valid size
 */
export const validateSize = (size) => {
  return Object.values(SIZES).includes(size);
};

/**
 * Validate component variant
 * @param {string} component - Component type
 * @param {string} variant - Variant to validate
 * @returns {boolean} Is valid variant
 */
export const validateVariant = (component, variant) => {
  const componentVariants = COMPONENT_VARIANTS[component.toUpperCase()];
  return componentVariants && Object.values(componentVariants).includes(variant);
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get CSS class names from object
 * @param {Object} classes - Object with conditional classes
 * @returns {string} Combined class names
 */
export const getClassNames = (classes) => {
  return Object.entries(classes)
    .filter(([_, condition]) => condition)
    .map(([className, _]) => className)
    .join(' ');
};

/**
 * Merge theme objects
 * @param {Theme} baseTheme - Base theme object
 * @param {Partial<Theme>} overrides - Theme overrides
 * @returns {Theme} Merged theme object
 */
export const mergeThemes = (baseTheme, overrides) => {
  return {
    ...baseTheme,
    ...overrides,
    backgrounds: {
      ...baseTheme.backgrounds,
      ...overrides.backgrounds
    },
    text: {
      ...baseTheme.text,
      ...overrides.text
    },
    borders: {
      ...baseTheme.borders,
      ...overrides.borders
    },
    components: {
      ...baseTheme.components,
      ...overrides.components
    }
  };
};

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color string
 * @returns {Object} RGB color object
 */
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Calculate contrast ratio between two colors
 * @param {string} color1 - First color (hex)
 * @param {string} color2 - Second color (hex)
 * @returns {number} Contrast ratio
 */
export const calculateContrastRatio = (color1, color2) => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const getLuminance = (rgb) => {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);
  
  const bright = Math.max(lum1, lum2);
  const dark = Math.min(lum1, lum2);
  
  return (bright + 0.05) / (dark + 0.05);
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  COMPONENT_VARIANTS as VARIANTS,
  SIZES,
  ANIMATION_DURATIONS,
  BREAKPOINTS,
  Z_INDEX
};

export default {
  COMPONENT_VARIANTS,
  SIZES,
  ANIMATION_DURATIONS,
  BREAKPOINTS,
  Z_INDEX,
  validateThemeMode,
  validateSize,
  validateVariant,
  getClassNames,
  mergeThemes,
  hexToRgb,
  calculateContrastRatio
}; 