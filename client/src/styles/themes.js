/**
 * @fileoverview Comprehensive theme definitions for Nutri IQ
 * @version 1.0.0
 * @author Nutri IQ Team
 * 
 * Modern JavaScript theme system designed for:
 * - Web (Tailwind CSS)
 * - Future React Native compatibility
 * - TypeScript migration readiness
 * - Scalable architecture
 */

// =============================================================================
// THEME CONSTANTS
// =============================================================================

export const THEME_MODES = Object.freeze({
  DARK: 'dark',
  LIGHT: 'light',
  AUTO: 'auto'
});

export const ANIMATION_DURATIONS = Object.freeze({
  FAST: '150ms',
  NORMAL: '300ms',
  SLOW: '500ms'
});

export const BREAKPOINTS = Object.freeze({
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px'
});

// =============================================================================
// COLOR PALETTE DEFINITIONS
// =============================================================================

const colorPalette = {
  // Primary brand colors
  brand: {
    primary: '#3b82f6',    // Blue-500
    secondary: '#1e40af',  // Blue-700
    accent: '#60a5fa',     // Blue-400
    muted: '#93c5fd'       // Blue-300
  },
  
  // Semantic colors
  semantic: {
    success: '#10b981',    // Emerald-500
    warning: '#f59e0b',    // Amber-500
    error: '#ef4444',      // Red-500
    info: '#06b6d4'        // Cyan-500
  },
  
  // Neutral colors for dark theme
  neutrals: {
    dark: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617'
    }
  }
};

// =============================================================================
// THEME FOUNDATIONS
// =============================================================================

const foundations = {
  // Typography scale
  typography: {
    fontFamilies: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace']
    },
    fontSizes: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem'   // 36px
    },
    fontWeights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800'
    },
    lineHeights: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    }
  },
  
  // Spacing scale
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem'    // 64px
  },
  
  // Border radius scale
  borderRadius: {
    none: '0',
    sm: '0.125rem',  // 2px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px'
  },
  
  // Shadow definitions
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glow: '0 0 0 1px rgba(59, 130, 246, 0.6), 0 0 12px 3px rgba(59, 130, 246, 0.25)',
    // Theme-specific shadows
    dark: {
      card: '0 0 0 1px rgba(59, 130, 246, 0.6), 0 0 12px 3px rgba(59, 130, 246, 0.25)',
      cardHover: '0 0 0 1px rgba(59, 130, 246, 0.8), 0 0 16px 4px rgba(59, 130, 246, 0.35)',
      cardSubtle: '0 0 0 1px rgba(59, 130, 246, 0.4), 0 0 8px 2px rgba(59, 130, 246, 0.15)'
    },
    light: {
      card: '0 0 0 1px rgba(59, 130, 246, 0.2), 0 4px 12px 2px rgba(59, 130, 246, 0.08)',
      cardHover: '0 0 0 1px rgba(59, 130, 246, 0.3), 0 6px 16px 3px rgba(59, 130, 246, 0.12)',
      cardSubtle: '0 0 0 1px rgba(59, 130, 246, 0.15), 0 2px 8px 1px rgba(59, 130, 246, 0.05)'
    }
  }
};

// =============================================================================
// THEME FOUNDATIONS
// =============================================================================

const darkTheme = {
  mode: THEME_MODES.DARK,
  
  // Background colors
  backgrounds: {
    primary: {
      gradient: 'bg-gradient-to-br from-[#1a1f2b] to-[#2d3748]',
      solid: 'bg-[#1a1f2b]'
    },
    secondary: {
      translucent: 'bg-[#252B3B]/50',
      solid: 'bg-[#252B3B]',
      elevated: 'bg-[#2A3142]'
    },
    surface: {
      base: 'bg-[#374151]',
      elevated: 'bg-[#4b5563]',
      overlay: 'bg-black/50'
    },
    interactive: {
      hover: 'hover:bg-[#313d4f]',
      active: 'active:bg-[#1e293b]',
      focus: 'focus:bg-[#374151]'
    }
  },
  
  // Text colors
  text: {
    primary: 'text-white',
    secondary: 'text-gray-300',
    tertiary: 'text-gray-400',
    muted: 'text-gray-500',
    inverse: 'text-gray-900',
    accent: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  },
  
  // Border colors
  borders: {
    primary: 'border-blue-400/30',
    secondary: 'border-blue-400/20',
    accent: 'border-blue-400/30',
    transparent: 'border-transparent',
    focus: 'focus:border-blue-400'
  },
  
  // Component-specific styles
  components: {
    card: {
      base: 'bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]',
      elevated: 'bg-[#252B3B] border-gray-600 rounded-2xl p-6 shadow-[0_0_0_1px_rgba(59,130,246,0.8),0_0_16px_4px_rgba(59,130,246,0.35)]',
      interactive: 'bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)] hover:bg-[#2A3142] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.8),0_0_16px_4px_rgba(59,130,246,0.35)] transition-all duration-300',
      subtle: 'bg-[#252B3B]/30 backdrop-blur-sm rounded-2xl p-6 border border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.4),0_0_8px_2px_rgba(59,130,246,0.15)]',
      // Layout utilities
      layout: {
        full: 'h-full flex flex-col justify-between',
        flexCol: 'flex flex-col',
        flexRow: 'flex flex-row',
        center: 'flex items-center justify-center'
      }
    },
    button: {
      primary: 'bg-blue-600 text-white border border-blue-500 hover:bg-blue-700 focus:ring-blue-500 shadow-md',
      secondary: 'bg-gray-700 text-white border border-blue-400/30 hover:bg-gray-600 hover:border-blue-400/50 focus:ring-gray-500',
      ghost: 'text-gray-400 border border-blue-400/20 hover:text-white hover:bg-[#374151] hover:border-blue-400/40',
      pantry_open: 'px-4 py-2 bg-[#111827]/50 text-blue-200 font-semibold border border-blue-400/30 rounded-lg shadow-[0_0_8px_1px_rgba(100,180,255,0.25)] hover:bg-[#1e293b]/60 transition-all',
      pantry_build: 'w-full py-3 px-4 bg-[#111827]/50 text-green-200 font-semibold border border-green-400/40 rounded-xl shadow-[0_0_8px_1px_rgba(0,255,255,0.25)] hover:bg-[#1e293b]/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 backdrop-blur',
      meal_plan_generate: 'w-full group px-4 sm:px-8 py-3 sm:py-4 bg-[#111827]/50 text-blue-400 font-semibold border-2 border-blue-400/50 rounded-xl shadow-[0_0_12px_2px_rgba(59,130,246,0.3)] hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.35)] hover:bg-[#1e293b]/60 hover:border-blue-400/60 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-4 backdrop-blur relative overflow-hidden text-sm sm:text-lg',
      recipe_list_view: 'w-full group px-4 sm:px-8 py-3 sm:py-4 bg-[#111827]/50 text-emerald-400 font-semibold border-2 border-emerald-400/50 rounded-xl shadow-[0_0_12px_2px_rgba(16,185,129,0.3)] hover:shadow-[0_0_16px_4px_rgba(16,185,129,0.35)] hover:bg-[#1e293b]/60 hover:border-emerald-400/60 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-4 backdrop-blur relative overflow-hidden text-sm sm:text-lg',
      voice_intent: 'w-full px-6 py-3 text-lg font-semibold rounded-xl bg-[#111827]/50 text-blue-400 font-semibold border-2 border-blue-400/50 shadow-[0_0_12px_2px_rgba(59,130,246,0.3)] hover:shadow-[0_0_16px_4px_rgba(59,130,246,0.35)] hover:bg-[#1e293b]/60 hover:border-blue-400/60 hover:scale-[1.02] active:scale-95 transition-all backdrop-blur disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3',
      voice_intent_active: 'w-full px-6 py-3 text-lg font-semibold rounded-xl bg-blue-600 text-white border-2 border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3'
    },
    input: {
      base: 'bg-[#374151] text-white border-gray-600 placeholder-gray-400',
      focus: 'focus:ring-blue-500 focus:border-blue-500'
    },
    tag: {
      blue: 'bg-blue-500/20 text-blue-400',
      green: 'bg-green-500/20 text-green-400',
      yellow: 'bg-yellow-500/20 text-yellow-400',
      red: 'bg-red-500/20 text-red-400'
    },
    header: {
      container: 'mb-6 sm:mb-8 bg-[#252B3B]/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.4),0_0_8px_2px_rgba(59,130,246,0.15)]',
      mobile: 'flex flex-col sm:hidden gap-4',
      desktop: 'hidden sm:flex justify-between items-center',
      logo_container_mobile: 'w-16 h-16 relative flex-shrink-0',
      logo_container_desktop: 'w-24 h-24 relative flex-shrink-0',
      logo_image: 'absolute inset-0 w-full h-full object-contain rounded-xl',
      title_mobile: 'text-2xl font-black tracking-tight border-b-2 border-blue-400/30 pb-1 shadow-[0_4px_8px_-4px_rgba(59,130,246,0.5)]',
      title_desktop: 'text-4xl font-black tracking-tight border-b-2 border-blue-400/30 pb-1 shadow-[0_4px_8px_-4px_rgba(59,130,246,0.5)]',
      title_nutri: 'text-white',
      title_iq: 'text-blue-400',
      subtitle_mobile: 'text-gray-400 mt-1 text-xs tracking-wide',
      subtitle_desktop: 'text-gray-400 mt-3 text-sm tracking-wide',
      logout_button: 'flex items-center gap-2 bg-[#2A3142] px-3 py-2 rounded-lg border border-[#ffffff1a] hover:bg-[#313d4f] transition-colors group shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]',
      logout_button_desktop: 'flex items-center gap-2 bg-[#2A3142] px-4 py-2 rounded-lg border border-[#ffffff1a] hover:bg-[#313d4f] transition-colors group shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]',
      user_label: 'text-gray-400 text-xs',
      user_name: 'text-white font-medium group-hover:text-blue-400 transition-colors',
      avatar_fallback: 'bg-gray-600 rounded-full flex items-center justify-center',
      icon_color: 'text-blue-400',
      icon_hover: 'text-gray-400 group-hover:text-blue-400 transition-colors'
    }
  }
};

// =============================================================================
// LIGHT THEME DEFINITION
// =============================================================================

const lightTheme = {
  mode: THEME_MODES.LIGHT,
  
  // Background colors - WHITE backgrounds with proper contrast
  backgrounds: {
    primary: {
      gradient: 'bg-gradient-to-br from-white to-gray-50',
      solid: 'bg-white'
    },
    secondary: {
      translucent: 'bg-white/95',
      solid: 'bg-white',
      elevated: 'bg-white'  // Changed from gray-50 to white
    },
    surface: {
      base: 'bg-gray-50',
      elevated: 'bg-white',
      overlay: 'bg-black/40'
    },
    interactive: {
      hover: 'hover:bg-gray-50',
      active: 'active:bg-gray-100',
      focus: 'focus:bg-blue-50'
    }
  },
  
  // Text colors - Much stronger contrast
  text: {
    primary: 'text-gray-900',      // Almost black for best readability
    secondary: 'text-gray-700',    // Strong gray instead of muted
    tertiary: 'text-gray-600',     // Medium gray for less important text
    muted: 'text-gray-500',        // Only for very subtle text
    inverse: 'text-white',
    accent: 'text-blue-600',       // Strong blue for accents
    success: 'text-green-600',
    warning: 'text-amber-600',
    error: 'text-red-600'
  },
  
  // Border colors - Better definition
  borders: {
    primary: 'border-blue-400/30',
    secondary: 'border-blue-400/20',
    accent: 'border-blue-400/30',
    transparent: 'border-transparent',
    focus: 'focus:border-blue-400'
  },
  
  // Component-specific styles
  components: {
    card: {
      base: 'bg-white backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.1)]',
      elevated: 'bg-white border border-gray-200 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.15)]',
      interactive: 'bg-white backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all duration-300',
      subtle: 'bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)]',
      // Layout utilities
      layout: {
        full: 'h-full flex flex-col justify-between',
        flexCol: 'flex flex-col',
        flexRow: 'flex flex-row',
        center: 'flex items-center justify-center'
      }
    },
    button: {
      primary: 'bg-blue-600 text-white border border-blue-500 hover:bg-blue-700 focus:ring-blue-500 shadow-md',
      secondary: 'bg-white text-gray-900 border border-blue-400/50 hover:bg-gray-50 hover:border-blue-400/70 focus:ring-blue-500 shadow-sm',
      ghost: 'text-gray-700 border border-blue-400/30 hover:text-gray-900 hover:bg-gray-100 hover:border-blue-400/50',
      pantry_open: 'px-4 py-2 bg-white text-blue-600 font-semibold border border-blue-400/30 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:bg-blue-50 transition-all',
      pantry_build: 'w-full py-3 px-4 bg-white text-green-600 font-semibold border border-green-500 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
      meal_plan_generate: 'w-full group px-4 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 font-semibold border-2 border-blue-500 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-blue-50 hover:border-blue-600 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-4 relative overflow-hidden text-sm sm:text-lg',
      recipe_list_view: 'w-full group px-4 sm:px-8 py-3 sm:py-4 bg-white text-emerald-600 font-semibold border-2 border-emerald-500 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-emerald-50 hover:border-emerald-600 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-4 relative overflow-hidden text-sm sm:text-lg',
      voice_intent: 'w-full px-6 py-3 text-lg font-semibold rounded-xl bg-white text-blue-600 font-semibold border-2 border-blue-400 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] hover:bg-blue-50 hover:border-blue-500 hover:scale-[1.02] active:scale-95 transition-all backdrop-blur disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3',
      voice_intent_active: 'w-full px-6 py-3 text-lg font-semibold rounded-xl bg-blue-600 text-white border-2 border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3'
    },
    input: {
      base: 'bg-white text-gray-900 border-gray-300 placeholder-gray-500 shadow-sm',
      focus: 'focus:ring-blue-500 focus:border-blue-500'
    },
    tag: {
      blue: 'bg-blue-100 text-blue-800 border border-blue-200',
      green: 'bg-green-100 text-green-800 border border-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      red: 'bg-red-100 text-red-800 border border-red-200'
    },
    header: {
      container: 'mb-6 sm:mb-8 bg-white backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.1)]',
      mobile: 'flex flex-col sm:hidden gap-4',
      desktop: 'hidden sm:flex justify-between items-center',
      logo_container_mobile: 'w-16 h-16 relative flex-shrink-0',
      logo_container_desktop: 'w-24 h-24 relative flex-shrink-0',
      logo_image: 'absolute inset-0 w-full h-full object-contain rounded-xl',
      title_mobile: 'text-2xl font-black tracking-tight border-b-2 border-blue-500/30 pb-1 shadow-[0_2px_4px_-2px_rgba(59,130,246,0.3)]',
      title_desktop: 'text-4xl font-black tracking-tight border-b-2 border-blue-500/30 pb-1 shadow-[0_2px_4px_-2px_rgba(59,130,246,0.3)]',
      title_nutri: 'text-gray-900',
      title_iq: 'text-blue-600',
      subtitle_mobile: 'text-gray-600 mt-1 text-xs tracking-wide',
      subtitle_desktop: 'text-gray-600 mt-3 text-sm tracking-wide',
      logout_button: 'flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors group shadow-[0_2px_4px_rgba(0,0,0,0.1)]',
      logout_button_desktop: 'flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors group shadow-[0_2px_4px_rgba(0,0,0,0.1)]',
      user_label: 'text-gray-500 text-xs',
      user_name: 'text-gray-900 font-medium group-hover:text-blue-600 transition-colors',
      avatar_fallback: 'bg-gray-300 rounded-full flex items-center justify-center',
      icon_color: 'text-blue-600',
      icon_hover: 'text-gray-500 group-hover:text-blue-600 transition-colors'
    }
  }
};

// =============================================================================
// THEME REGISTRY
// =============================================================================

export const themes = {
  [THEME_MODES.DARK]: darkTheme,
  [THEME_MODES.LIGHT]: lightTheme
};

// =============================================================================
// THEME UTILITIES
// =============================================================================

/**
 * Get theme by mode with fallback
 * @param {string} mode - Theme mode
 * @returns {Object} Theme object
 */
export const getTheme = (mode = THEME_MODES.DARK) => {
  return themes[mode] || themes[THEME_MODES.DARK];
};

/**
 * Check if theme mode is valid
 * @param {string} mode - Theme mode to validate
 * @returns {boolean} Is valid theme mode
 */
export const isValidThemeMode = (mode) => {
  return Object.values(THEME_MODES).includes(mode);
};

/**
 * Get available theme modes
 * @returns {string[]} Array of theme mode strings
 */
export const getAvailableThemes = () => {
  return Object.keys(themes);
};

/**
 * Get system theme preference
 * @returns {string} System theme preference
 */
export const getSystemTheme = () => {
  if (typeof window === 'undefined') return THEME_MODES.DARK;
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEME_MODES.DARK
    : THEME_MODES.LIGHT;
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  foundations,
  colorPalette,
  darkTheme,
  lightTheme
};

export default themes; 