/**
 * @fileoverview Simple Test App for Theme System
 * @version 1.0.0
 * @author Nutri IQ Team
 * 
 * This is a simple test app that can temporarily replace the main App.jsx
 * to test the theme system in isolation within the existing React setup.
 */

import React from 'react';
import ThemeSystemTest from './ThemeSystemTest.jsx';

/**
 * Test App Component
 * Simple wrapper that just renders the theme system test
 */
const TestApp = () => {
  return (
    <div className="theme-test-app">
      <ThemeSystemTest />
    </div>
  );
};

export default TestApp; 