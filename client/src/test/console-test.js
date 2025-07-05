/**
 * @fileoverview Console Test for Theme System
 * @version 1.0.0
 * @author Nutri IQ Team
 * 
 * This script tests the theme system functions without needing React components.
 * Run in browser console or Node.js environment.
 */

// Import theme system (adjust paths as needed)
import { THEME_MODES, getTheme, themes } from '../styles/themes.js';
import { 
  getCardStyles, 
  getButtonStyles, 
  getInputStyles, 
  getTextStyles,
  createStyleUtils,
  memoizedStyles 
} from '../utils/styleUtils.js';

/**
 * Console Test Runner
 */
class ThemeSystemConsoleTest {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Add a test case
   * @param {string} name - Test name
   * @param {Function} testFn - Test function
   */
  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  /**
   * Assert helper
   * @param {boolean} condition - Condition to test
   * @param {string} message - Error message if fails
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  /**
   * Run all tests
   */
  async run() {
    console.log('🧪 Running Theme System Tests...\n');
    
    for (const { name, testFn } of this.tests) {
      try {
        await testFn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.error(`❌ ${name}: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed === 0) {
      console.log('🎉 All tests passed! Theme system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the errors above.');
    }
  }
}

// Initialize test runner
const testRunner = new ThemeSystemConsoleTest();

// Test 1: Theme Constants
testRunner.test('Theme Constants', () => {
  testRunner.assert(THEME_MODES.DARK === 'dark', 'Dark mode constant should be "dark"');
  testRunner.assert(THEME_MODES.LIGHT === 'light', 'Light mode constant should be "light"');
  testRunner.assert(typeof themes === 'object', 'Themes should be an object');
});

// Test 2: Theme Objects
testRunner.test('Theme Objects', () => {
  const darkTheme = getTheme(THEME_MODES.DARK);
  const lightTheme = getTheme(THEME_MODES.LIGHT);
  
  testRunner.assert(darkTheme.mode === 'dark', 'Dark theme should have mode "dark"');
  testRunner.assert(lightTheme.mode === 'light', 'Light theme should have mode "light"');
  
  testRunner.assert(darkTheme.backgrounds, 'Dark theme should have backgrounds');
  testRunner.assert(darkTheme.text, 'Dark theme should have text colors');
  testRunner.assert(darkTheme.components, 'Dark theme should have component styles');
  
  testRunner.assert(lightTheme.backgrounds, 'Light theme should have backgrounds');
  testRunner.assert(lightTheme.text, 'Light theme should have text colors');
  testRunner.assert(lightTheme.components, 'Light theme should have component styles');
});

// Test 3: Style Utilities
testRunner.test('Style Utilities', () => {
  const darkCardStyles = getCardStyles(THEME_MODES.DARK, 'base');
  const lightCardStyles = getCardStyles(THEME_MODES.LIGHT, 'base');
  
  testRunner.assert(typeof darkCardStyles === 'string', 'Card styles should return string');
  testRunner.assert(darkCardStyles.length > 0, 'Card styles should not be empty');
  testRunner.assert(darkCardStyles !== lightCardStyles, 'Dark and light card styles should be different');
  
  const buttonStyles = getButtonStyles(THEME_MODES.DARK, 'primary');
  testRunner.assert(typeof buttonStyles === 'string', 'Button styles should return string');
  testRunner.assert(buttonStyles.includes('bg-blue-600'), 'Primary button should have blue background');
});

// Test 4: Button Variants
testRunner.test('Button Variants', () => {
  const primaryBtn = getButtonStyles(THEME_MODES.DARK, 'primary');
  const secondaryBtn = getButtonStyles(THEME_MODES.DARK, 'secondary');
  const ghostBtn = getButtonStyles(THEME_MODES.DARK, 'ghost');
  
  testRunner.assert(primaryBtn !== secondaryBtn, 'Primary and secondary buttons should be different');
  testRunner.assert(primaryBtn !== ghostBtn, 'Primary and ghost buttons should be different');
  testRunner.assert(secondaryBtn !== ghostBtn, 'Secondary and ghost buttons should be different');
});

// Test 5: Input Styles with Options
testRunner.test('Input Styles with Options', () => {
  const normalInput = getInputStyles(THEME_MODES.DARK);
  const errorInput = getInputStyles(THEME_MODES.DARK, { hasError: true });
  const smallInput = getInputStyles(THEME_MODES.DARK, { size: 'sm' });
  
  testRunner.assert(typeof normalInput === 'string', 'Normal input styles should return string');
  testRunner.assert(errorInput.includes('red'), 'Error input should include red styling');
  testRunner.assert(normalInput !== errorInput, 'Normal and error inputs should be different');
  testRunner.assert(normalInput !== smallInput, 'Normal and small inputs should be different');
});

// Test 6: Text Styles
testRunner.test('Text Styles', () => {
  const headingText = getTextStyles(THEME_MODES.DARK, 'heading');
  const bodyText = getTextStyles(THEME_MODES.DARK, 'body');
  const captionText = getTextStyles(THEME_MODES.DARK, 'caption');
  
  testRunner.assert(typeof headingText === 'string', 'Heading text styles should return string');
  testRunner.assert(headingText !== bodyText, 'Heading and body text should be different');
  testRunner.assert(bodyText !== captionText, 'Body and caption text should be different');
});

// Test 7: Style Utils Factory
testRunner.test('Style Utils Factory', () => {
  const styleUtils = createStyleUtils(THEME_MODES.DARK);
  
  testRunner.assert(typeof styleUtils === 'object', 'Style utils should return object');
  testRunner.assert(typeof styleUtils.card === 'function', 'Style utils should have card function');
  testRunner.assert(typeof styleUtils.button === 'function', 'Style utils should have button function');
  testRunner.assert(typeof styleUtils.combineClasses === 'function', 'Style utils should have combineClasses function');
  
  const combinedClasses = styleUtils.combineClasses('class1', 'class2', 'class3');
  testRunner.assert(combinedClasses === 'class1 class2 class3', 'combineClasses should join classes');
});

// Test 8: Conditional Classes
testRunner.test('Conditional Classes', () => {
  const styleUtils = createStyleUtils(THEME_MODES.DARK);
  
  const conditionalTrue = styleUtils.conditionalClass(true, 'active-class', 'inactive-class');
  const conditionalFalse = styleUtils.conditionalClass(false, 'active-class', 'inactive-class');
  
  testRunner.assert(conditionalTrue === 'active-class', 'Conditional class should return true class when condition is true');
  testRunner.assert(conditionalFalse === 'inactive-class', 'Conditional class should return false class when condition is false');
});

// Test 9: Memoization
testRunner.test('Memoization', () => {
  let callCount = 0;
  
  const testGenerator = () => {
    callCount++;
    return 'generated-style';
  };
  
  const result1 = memoizedStyles('test-key', testGenerator);
  const result2 = memoizedStyles('test-key', testGenerator);
  
  testRunner.assert(result1 === result2, 'Memoized results should be identical');
  testRunner.assert(callCount === 1, 'Generator should only be called once for same key');
});

// Test 10: Theme Switching
testRunner.test('Theme Switching', () => {
  const darkStyles = getCardStyles(THEME_MODES.DARK, 'base');
  const lightStyles = getCardStyles(THEME_MODES.LIGHT, 'base');
  
  testRunner.assert(darkStyles !== lightStyles, 'Theme switching should produce different styles');
  
  // Test multiple theme switches
  const darkAgain = getCardStyles(THEME_MODES.DARK, 'base');
  testRunner.assert(darkStyles === darkAgain, 'Same theme should produce consistent styles');
});

/**
 * Browser Console Test Function
 * Run this in browser console to test the theme system
 */
window.testThemeSystem = async function() {
  console.clear();
  console.log('%c🎨 Theme System Console Test', 'font-size: 20px; font-weight: bold; color: #3b82f6;');
  console.log('Testing theme system functionality...\n');
  
  await testRunner.run();
  
  // Additional browser-specific tests
  console.log('\n🌐 Browser-specific tests:');
  
  // Test DOM manipulation
  const testElement = document.createElement('div');
  testElement.className = getCardStyles('dark', 'elevated');
  console.log('✅ DOM element styling:', testElement.className);
  
  // Test CSS class validity
  const classes = getButtonStyles('dark', 'primary').split(' ');
  const validClasses = classes.filter(cls => cls.length > 0);
  console.log('✅ CSS classes generated:', validClasses.length, 'classes');
  
  console.log('\n🎉 Theme system is ready for use!');
};

/**
 * Node.js Test Export
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testRunner, ThemeSystemConsoleTest };
}

// Auto-run in browser if window is available
if (typeof window !== 'undefined') {
  console.log('Theme system console test loaded. Run testThemeSystem() to start testing.');
} 