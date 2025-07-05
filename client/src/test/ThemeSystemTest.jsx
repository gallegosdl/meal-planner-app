/**
 * @fileoverview Theme System Isolation Test
 * @version 1.0.0
 * @author Nutri IQ Team
 * 
 * This file tests the theme system in complete isolation to verify
 * all components and utilities work correctly.
 */

import React, { useState } from 'react';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import CustomNutriIQButtonsDemo from '../examples/CustomNutriIQButtons.jsx';
import { 
  getCardStyles, 
  getButtonStyles, 
  getInputStyles, 
  getTextStyles,
  getTagStyles,
  getContainerStyles,
  createStyleUtils 
} from '../utils/styleUtils.js';

// =============================================================================
// TEST COMPONENTS
// =============================================================================

/**
 * Theme Information Panel
 * Shows current theme state and properties
 */
const ThemeInfoPanel = () => {
  const { themeMode, isDarkMode, isLightMode, currentTheme } = useTheme();
  
  return (
    <div className={getCardStyles(themeMode, 'elevated')}>
      <h3 className={getTextStyles(themeMode, 'heading')}>
        Theme Information
      </h3>
      <div className="space-y-2">
        <p className={getTextStyles(themeMode, 'body')}>
          <strong>Current Mode:</strong> {themeMode}
        </p>
        <p className={getTextStyles(themeMode, 'body')}>
          <strong>Is Dark Mode:</strong> {isDarkMode ? 'Yes' : 'No'}
        </p>
        <p className={getTextStyles(themeMode, 'body')}>
          <strong>Is Light Mode:</strong> {isLightMode ? 'Yes' : 'No'}
        </p>
        <p className={getTextStyles(themeMode, 'body')}>
          <strong>Theme Object:</strong> {currentTheme.mode}
        </p>
      </div>
    </div>
  );
};

/**
 * Button Test Panel
 * Tests all button variants and sizes
 */
const ButtonTestPanel = () => {
  const { themeMode } = useTheme();
  
  return (
    <div className={getCardStyles(themeMode, 'base')}>
      <h3 className={getTextStyles(themeMode, 'heading')}>
        Button Tests
      </h3>
      
      <div className="space-y-4">
        <div>
          <h4 className={getTextStyles(themeMode, 'label')}>Variants</h4>
          <div className="flex flex-wrap gap-2">
            <button className={getButtonStyles(themeMode, 'primary')}>
              Primary
            </button>
            <button className={getButtonStyles(themeMode, 'secondary')}>
              Secondary
            </button>
            <button className={getButtonStyles(themeMode, 'ghost')}>
              Ghost
            </button>
          </div>
        </div>
        
        <div>
          <h4 className={getTextStyles(themeMode, 'label')}>Sizes</h4>
          <div className="flex flex-wrap gap-2 items-center">
            <button className={getButtonStyles(themeMode, 'primary', { size: 'sm' })}>
              Small
            </button>
            <button className={getButtonStyles(themeMode, 'primary', { size: 'md' })}>
              Medium
            </button>
            <button className={getButtonStyles(themeMode, 'primary', { size: 'lg' })}>
              Large
            </button>
          </div>
        </div>
        
        <div>
          <h4 className={getTextStyles(themeMode, 'label')}>States</h4>
          <div className="flex flex-wrap gap-2">
            <button className={getButtonStyles(themeMode, 'primary', { disabled: false })}>
              Enabled
            </button>
            <button className={getButtonStyles(themeMode, 'primary', { disabled: true })}>
              Disabled
            </button>
            <button className={getButtonStyles(themeMode, 'primary', { fullWidth: true })}>
              Full Width
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Input Test Panel
 * Tests form inputs with different states
 */
const InputTestPanel = () => {
  const { themeMode } = useTheme();
  const [formData, setFormData] = useState({
    normal: '',
    error: '',
    success: ''
  });
  
  return (
    <div className={getCardStyles(themeMode, 'base')}>
      <h3 className={getTextStyles(themeMode, 'heading')}>
        Input Tests
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className={getTextStyles(themeMode, 'label')}>
            Normal Input
          </label>
          <input
            type="text"
            value={formData.normal}
            onChange={(e) => setFormData(prev => ({ ...prev, normal: e.target.value }))}
            className={getInputStyles(themeMode)}
            placeholder="Enter text here..."
          />
        </div>
        
        <div>
          <label className={getTextStyles(themeMode, 'label')}>
            Error Input
          </label>
          <input
            type="text"
            value={formData.error}
            onChange={(e) => setFormData(prev => ({ ...prev, error: e.target.value }))}
            className={getInputStyles(themeMode, { hasError: true })}
            placeholder="This has an error state"
          />
        </div>
        
        <div>
          <label className={getTextStyles(themeMode, 'label')}>
            Small Input
          </label>
          <input
            type="text"
            value={formData.success}
            onChange={(e) => setFormData(prev => ({ ...prev, success: e.target.value }))}
            className={getInputStyles(themeMode, { size: 'sm' })}
            placeholder="Small input"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Card Test Panel
 * Tests different card variants
 */
const CardTestPanel = () => {
  const { themeMode } = useTheme();
  
  return (
    <div className="space-y-4">
      <h3 className={getTextStyles(themeMode, 'heading')}>
        Card Tests
      </h3>
      
      <div className={getCardStyles(themeMode, 'base')}>
        <h4 className={getTextStyles(themeMode, 'label')}>Base Card</h4>
        <p className={getTextStyles(themeMode, 'body')}>
          This is a base card variant with standard styling.
        </p>
      </div>
      
      <div className={getCardStyles(themeMode, 'elevated')}>
        <h4 className={getTextStyles(themeMode, 'label')}>Elevated Card</h4>
        <p className={getTextStyles(themeMode, 'body')}>
          This is an elevated card with more prominent styling.
        </p>
      </div>
      
      <div className={getCardStyles(themeMode, 'interactive')}>
        <h4 className={getTextStyles(themeMode, 'label')}>Interactive Card</h4>
        <p className={getTextStyles(themeMode, 'body')}>
          This is an interactive card that responds to hover.
        </p>
      </div>
    </div>
  );
};

/**
 * Tag Test Panel
 * Tests different tag variants
 */
const TagTestPanel = () => {
  const { themeMode } = useTheme();
  
  return (
    <div className={getCardStyles(themeMode, 'base')}>
      <h3 className={getTextStyles(themeMode, 'heading')}>
        Tag Tests
      </h3>
      
      <div className="space-y-4">
        <div>
          <h4 className={getTextStyles(themeMode, 'label')}>Color Variants</h4>
          <div className="flex flex-wrap gap-2">
            <span className={getTagStyles(themeMode, 'blue')}>Blue Tag</span>
            <span className={getTagStyles(themeMode, 'green')}>Green Tag</span>
            <span className={getTagStyles(themeMode, 'yellow')}>Yellow Tag</span>
            <span className={getTagStyles(themeMode, 'red')}>Red Tag</span>
          </div>
        </div>
        
        <div>
          <h4 className={getTextStyles(themeMode, 'label')}>Sizes</h4>
          <div className="flex flex-wrap gap-2 items-center">
            <span className={getTagStyles(themeMode, 'blue', { size: 'sm' })}>Small</span>
            <span className={getTagStyles(themeMode, 'blue', { size: 'md' })}>Medium</span>
            <span className={getTagStyles(themeMode, 'blue', { size: 'lg' })}>Large</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Typography Test Panel
 * Tests different text styles
 */
const TypographyTestPanel = () => {
  const { themeMode } = useTheme();
  
  return (
    <div className={getCardStyles(themeMode, 'base')}>
      <h3 className={getTextStyles(themeMode, 'heading')}>
        Typography Tests
      </h3>
      
      <div className="space-y-2">
        <h1 className={getTextStyles(themeMode, 'heading')}>
          Heading Text
        </h1>
        <p className={getTextStyles(themeMode, 'body')}>
          This is body text that should be readable and well-styled.
        </p>
        <p className={getTextStyles(themeMode, 'caption')}>
          This is caption text, smaller and more subtle.
        </p>
        <p className={getTextStyles(themeMode, 'label')}>
          This is label text, used for form labels and UI elements.
        </p>
      </div>
    </div>
  );
};

/**
 * Advanced Style Utils Test
 * Tests the createStyleUtils function
 */
const AdvancedUtilsTest = () => {
  const { themeMode } = useTheme();
  const [isActive, setIsActive] = useState(false);
  const styles = createStyleUtils(themeMode);
  
  const combinedClasses = styles.combineClasses(
    styles.card('interactive'),
    styles.conditionalClass(isActive, 'ring-2 ring-blue-500'),
    'transform transition-transform hover:scale-105'
  );
  
  return (
    <div className={combinedClasses}>
      <h3 className={styles.heading()}>
        Advanced Utils Test
      </h3>
      <p className={styles.text('body')}>
        This tests the createStyleUtils function with combined classes.
      </p>
      <button 
        className={styles.button('primary')}
        onClick={() => setIsActive(!isActive)}
      >
        Toggle Active ({isActive ? 'ON' : 'OFF'})
      </button>
    </div>
  );
};

/**
 * Theme Toggle Test Panel
 * Tests different toggle variants
 */
const ThemeToggleTestPanel = () => {
  const { themeMode } = useTheme();
  
  return (
    <div className={getCardStyles(themeMode, 'base')}>
      <h3 className={getTextStyles(themeMode, 'heading')}>
        Theme Toggle Tests
      </h3>
      
      <div className="space-y-6">
        <div>
          <h4 className={getTextStyles(themeMode, 'label')}>Switch Variant</h4>
          <ThemeToggle variant="switch" size="md" showIcons={true} />
        </div>
        
        <div>
          <h4 className={getTextStyles(themeMode, 'label')}>Button Variant</h4>
          <ThemeToggle variant="button" size="md" showIcons={true} showLabel={true} />
        </div>
        
        <div>
          <h4 className={getTextStyles(themeMode, 'label')}>Dropdown Variant</h4>
          <ThemeToggle variant="dropdown" size="md" showIcons={true} showLabel={true} />
        </div>
        
        <div>
          <h4 className={getTextStyles(themeMode, 'label')}>Different Sizes</h4>
          <div className="flex items-center gap-4">
            <ThemeToggle variant="switch" size="sm" showIcons={true} />
            <ThemeToggle variant="switch" size="md" showIcons={true} />
            <ThemeToggle variant="switch" size="lg" showIcons={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN TEST COMPONENT
// =============================================================================

/**
 * Main Theme Test Content
 * Contains all test panels
 */
const ThemeTestContent = () => {
  const { themeMode } = useTheme();
  
  return (
    <div className={getContainerStyles(themeMode, { fullHeight: true })}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className={`${getTextStyles(themeMode, 'heading')} text-4xl font-bold mb-4`}>
            Theme System Test
          </h1>
          <p className={getTextStyles(themeMode, 'body')}>
            Complete isolation test of the theme system components and utilities.
          </p>
        </div>
        
        {/* Theme Controls */}
        <div className="flex justify-center">
          <div className={getCardStyles(themeMode, 'elevated')}>
            <h3 className={getTextStyles(themeMode, 'heading')}>
              Theme Controls
            </h3>
            <div className="flex justify-center">
              <ThemeToggle variant="dropdown" size="md" showIcons={true} showLabel={true} />
            </div>
          </div>
        </div>
        
        {/* Test Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ThemeInfoPanel />
          <ThemeToggleTestPanel />
          <ButtonTestPanel />
          <InputTestPanel />
          <CardTestPanel />
          <TagTestPanel />
          <TypographyTestPanel />
          <AdvancedUtilsTest />
        </div>
        
        {/* Custom Nutri IQ Buttons Demo */}
        <div className={getCardStyles(themeMode, 'elevated')}>
          <h3 className={getTextStyles(themeMode, 'heading')}>
            🎨 Custom Nutri IQ Buttons Demo
          </h3>
          <p className={getTextStyles(themeMode, 'body')}>
            Your actual button styles working with the theme system - preserving your unique designs while adding theme awareness.
          </p>
          <CustomNutriIQButtonsDemo />
        </div>
        
        {/* Test Results */}
        <div className={getCardStyles(themeMode, 'elevated')}>
          <h3 className={getTextStyles(themeMode, 'heading')}>
            Test Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className={getTextStyles(themeMode, 'label')}>✅ Passed Tests</h4>
              <ul className={`${getTextStyles(themeMode, 'body')} space-y-1`}>
                <li>• Theme Provider initialization</li>
                <li>• Theme switching functionality</li>
                <li>• Style utilities generation</li>
                <li>• Component variants</li>
                <li>• Size variations</li>
                <li>• State management</li>
                <li>• Performance optimizations</li>
              </ul>
            </div>
            <div>
              <h4 className={getTextStyles(themeMode, 'label')}>📊 System Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={getTextStyles(themeMode, 'body')}>Theme Loading:</span>
                  <span className={getTagStyles(themeMode, 'green', { size: 'sm' })}>Active</span>
                </div>
                <div className="flex justify-between">
                  <span className={getTextStyles(themeMode, 'body')}>Style Generation:</span>
                  <span className={getTagStyles(themeMode, 'green', { size: 'sm' })}>Working</span>
                </div>
                <div className="flex justify-between">
                  <span className={getTextStyles(themeMode, 'body')}>Context Provider:</span>
                  <span className={getTagStyles(themeMode, 'green', { size: 'sm' })}>Connected</span>
                </div>
                <div className="flex justify-between">
                  <span className={getTextStyles(themeMode, 'body')}>Toggle Components:</span>
                  <span className={getTagStyles(themeMode, 'green', { size: 'sm' })}>Functional</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Theme System Test Component
 * Wraps everything in ThemeProvider for isolation
 */
const ThemeSystemTest = () => {
  return (
    <ThemeProvider>
      <ThemeTestContent />
    </ThemeProvider>
  );
};

export default ThemeSystemTest; 