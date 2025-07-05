/**
 * @fileoverview Theme System Usage Examples
 * @version 1.0.0
 * @author Nutri IQ Team
 * 
 * This file contains comprehensive examples of how to use the theme system
 * in different scenarios and patterns.
 */

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { 
  getCardStyles, 
  getButtonStyles, 
  getInputStyles, 
  getTextStyles,
  createStyleUtils,
  memoizedStyles 
} from '../utils/styleUtils.js';

// =============================================================================
// BASIC USAGE EXAMPLES
// =============================================================================

/**
 * Example 1: Basic Theme-Aware Component
 * Shows the simplest way to use the theme system
 */
export const BasicExample = () => {
  const { themeMode } = useTheme();
  
  return (
    <div className={getCardStyles(themeMode, 'elevated')}>
      <h2 className={getTextStyles(themeMode, 'heading')}>
        Basic Theme Example
      </h2>
      <p className={getTextStyles(themeMode, 'body')}>
        This component uses utility functions to get theme-appropriate styles.
      </p>
      <button className={getButtonStyles(themeMode, 'primary')}>
        Primary Button
      </button>
    </div>
  );
};

/**
 * Example 2: Multiple Button Variants
 * Shows different button styles and sizes
 */
export const ButtonVariantsExample = () => {
  const { themeMode } = useTheme();
  
  return (
    <div className={getCardStyles(themeMode, 'base')}>
      <h3 className={getTextStyles(themeMode, 'heading')}>
        Button Variants
      </h3>
      <div className="flex flex-wrap gap-4">
        <button className={getButtonStyles(themeMode, 'primary', { size: 'sm' })}>
          Small Primary
        </button>
        <button className={getButtonStyles(themeMode, 'primary', { size: 'md' })}>
          Medium Primary
        </button>
        <button className={getButtonStyles(themeMode, 'primary', { size: 'lg' })}>
          Large Primary
        </button>
      </div>
      <div className="flex flex-wrap gap-4 mt-4">
        <button className={getButtonStyles(themeMode, 'secondary')}>
          Secondary
        </button>
        <button className={getButtonStyles(themeMode, 'ghost')}>
          Ghost
        </button>
        <button className={getButtonStyles(themeMode, 'primary', { disabled: true })}>
          Disabled
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// ADVANCED USAGE EXAMPLES
// =============================================================================

/**
 * Example 3: Advanced Style Composition
 * Shows how to combine multiple utilities and add custom styles
 */
export const AdvancedCompositionExample = () => {
  const { themeMode } = useTheme();
  const [isActive, setIsActive] = useState(false);
  const styles = createStyleUtils(themeMode);
  
  // Combine multiple utilities
  const cardClasses = styles.combineClasses(
    styles.card('interactive'),
    styles.conditionalClass(isActive, 'ring-2 ring-blue-500'),
    'transform hover:scale-105'
  );
  
  return (
    <div className={cardClasses}>
      <h3 className={styles.heading()}>
        Advanced Composition
      </h3>
      <p className={styles.text('body')}>
        This card demonstrates style composition with conditional classes.
      </p>
      <button 
        className={styles.button('primary')}
        onClick={() => setIsActive(!isActive)}
      >
        Toggle Active State
      </button>
      <p className={styles.text('caption')}>
        Active: {isActive ? 'Yes' : 'No'}
      </p>
    </div>
  );
};

/**
 * Example 4: Form Components with Theme
 * Shows themed form inputs and validation states
 */
export const FormExample = () => {
  const { themeMode } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    hasError: false
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormData(prev => ({
      ...prev,
      hasError: !prev.name || !prev.email
    }));
  };
  
  return (
    <div className={getCardStyles(themeMode, 'elevated')}>
      <h3 className={getTextStyles(themeMode, 'heading')}>
        Themed Form Example
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={getTextStyles(themeMode, 'label')}>
            Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={getInputStyles(themeMode, { 
              hasError: formData.hasError && !formData.name 
            })}
            placeholder="Enter your name"
          />
          {formData.hasError && !formData.name && (
            <p className={getTextStyles(themeMode, 'caption', { color: 'error' })}>
              Name is required
            </p>
          )}
        </div>
        
        <div>
          <label className={getTextStyles(themeMode, 'label')}>
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className={getInputStyles(themeMode, { 
              hasError: formData.hasError && !formData.email 
            })}
            placeholder="Enter your email"
          />
          {formData.hasError && !formData.email && (
            <p className={getTextStyles(themeMode, 'caption', { color: 'error' })}>
              Email is required
            </p>
          )}
        </div>
        
        <button 
          type="submit"
          className={getButtonStyles(themeMode, 'primary', { fullWidth: true })}
        >
          Submit Form
        </button>
      </form>
    </div>
  );
};

// =============================================================================
// PERFORMANCE OPTIMIZATION EXAMPLES
// =============================================================================

/**
 * Example 5: Memoized Styles
 * Shows how to use memoization for performance optimization
 */
export const PerformanceExample = ({ variant = 'elevated', size = 'md' }) => {
  const { themeMode } = useTheme();
  
  // Memoize expensive style calculations
  const cardStyles = React.useMemo(() => 
    getCardStyles(themeMode, variant), 
    [themeMode, variant]
  );
  
  const buttonStyles = React.useMemo(() => 
    getButtonStyles(themeMode, 'primary', { size }),
    [themeMode, size]
  );
  
  // Or use the built-in memoization utility
  const memoizedCardStyles = memoizedStyles(
    `card-${themeMode}-${variant}`,
    () => getCardStyles(themeMode, variant)
  );
  
  return (
    <div className={cardStyles}>
      <h3 className={getTextStyles(themeMode, 'heading')}>
        Performance Optimized
      </h3>
      <p className={getTextStyles(themeMode, 'body')}>
        This component uses memoized styles for better performance.
      </p>
      <button className={buttonStyles}>
        Optimized Button
      </button>
    </div>
  );
};

/**
 * Example 6: Custom Theme Hook
 * Shows how to create a custom hook for specific use cases
 */
export const useCustomTheme = () => {
  const { themeMode, currentTheme } = useTheme();
  
  return React.useMemo(() => ({
    // Pre-computed common styles
    cardBase: getCardStyles(themeMode, 'base'),
    cardElevated: getCardStyles(themeMode, 'elevated'),
    cardInteractive: getCardStyles(themeMode, 'interactive'),
    
    // Button variants
    primaryButton: getButtonStyles(themeMode, 'primary'),
    secondaryButton: getButtonStyles(themeMode, 'secondary'),
    ghostButton: getButtonStyles(themeMode, 'ghost'),
    
    // Text styles
    heading: getTextStyles(themeMode, 'heading'),
    body: getTextStyles(themeMode, 'body'),
    caption: getTextStyles(themeMode, 'caption'),
    
    // Utilities
    theme: currentTheme,
    mode: themeMode
  }), [themeMode, currentTheme]);
};

export const CustomHookExample = () => {
  const styles = useCustomTheme();
  
  return (
    <div className={styles.cardElevated}>
      <h3 className={styles.heading}>
        Custom Hook Example
      </h3>
      <p className={styles.body}>
        This component uses a custom hook for commonly used styles.
      </p>
      <div className="flex gap-2">
        <button className={styles.primaryButton}>Primary</button>
        <button className={styles.secondaryButton}>Secondary</button>
        <button className={styles.ghostButton}>Ghost</button>
      </div>
    </div>
  );
};

// =============================================================================
// COMPLEX COMPONENT EXAMPLES
// =============================================================================

/**
 * Example 7: Data Display Component
 * Shows how to theme complex data display components
 */
export const DataDisplayExample = () => {
  const { themeMode } = useTheme();
  
  const data = [
    { id: 1, name: 'John Doe', status: 'active', role: 'admin' },
    { id: 2, name: 'Jane Smith', status: 'inactive', role: 'user' },
    { id: 3, name: 'Bob Johnson', status: 'active', role: 'editor' }
  ];
  
  const getStatusColor = (status) => {
    return status === 'active' ? 'green' : 'red';
  };
  
  return (
    <div className={getCardStyles(themeMode, 'elevated')}>
      <h3 className={getTextStyles(themeMode, 'heading')}>
        User Data Table
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={themeMode === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200'}>
              <th className={`${getTextStyles(themeMode, 'label')} text-left p-2`}>Name</th>
              <th className={`${getTextStyles(themeMode, 'label')} text-left p-2`}>Status</th>
              <th className={`${getTextStyles(themeMode, 'label')} text-left p-2`}>Role</th>
              <th className={`${getTextStyles(themeMode, 'label')} text-left p-2`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((user) => (
              <tr key={user.id} className={`${themeMode === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}>
                <td className={`${getTextStyles(themeMode, 'body')} p-2`}>
                  {user.name}
                </td>
                <td className="p-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.status === 'active' 
                      ? (themeMode === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
                      : (themeMode === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className={`${getTextStyles(themeMode, 'body')} p-2`}>
                  {user.role}
                </td>
                <td className="p-2">
                  <button className={getButtonStyles(themeMode, 'ghost', { size: 'sm' })}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Example 8: Dashboard Widget
 * Shows a complete dashboard widget with theming
 */
export const DashboardWidgetExample = () => {
  const { themeMode } = useTheme();
  const [timeRange, setTimeRange] = useState('7d');
  
  const stats = {
    users: 1234,
    growth: '+12.3%',
    revenue: '$45,678',
    conversion: '3.2%'
  };
  
  return (
    <div className={getCardStyles(themeMode, 'elevated')}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={getTextStyles(themeMode, 'heading')}>
          Dashboard Overview
        </h3>
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className={getInputStyles(themeMode, { size: 'sm', fullWidth: false })}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-lg ${themeMode === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className={getTextStyles(themeMode, 'caption')}>Total Users</p>
          <p className={`${getTextStyles(themeMode, 'heading')} text-2xl`}>{stats.users}</p>
          <p className={getTextStyles(themeMode, 'caption', { color: 'success' })}>
            {stats.growth}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg ${themeMode === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className={getTextStyles(themeMode, 'caption')}>Revenue</p>
          <p className={`${getTextStyles(themeMode, 'heading')} text-2xl`}>{stats.revenue}</p>
          <p className={getTextStyles(themeMode, 'caption')}>
            {stats.conversion} conversion
          </p>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button className={getButtonStyles(themeMode, 'primary', { fullWidth: true })}>
          View Detailed Report
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN EXAMPLES CONTAINER
// =============================================================================

/**
 * Main Examples Container
 * Displays all theme examples in a grid layout
 */
export const ThemeExamplesContainer = () => {
  const { themeMode } = useTheme();
  
  return (
    <div className={`min-h-screen p-6 ${themeMode === 'dark' ? 'bg-gradient-to-br from-[#1a1f2b] to-[#2d3748]' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      <div className="max-w-7xl mx-auto">
        <h1 className={`${getTextStyles(themeMode, 'heading')} text-3xl mb-8`}>
          Theme System Examples
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BasicExample />
          <ButtonVariantsExample />
          <AdvancedCompositionExample />
          <FormExample />
          <PerformanceExample />
          <CustomHookExample />
          <DataDisplayExample />
          <DashboardWidgetExample />
        </div>
      </div>
    </div>
  );
};

export default ThemeExamplesContainer; 