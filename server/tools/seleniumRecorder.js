const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs').promises;
const path = require('path');

class SeleniumRecorder {
  constructor() {
    this.driver = null;
    this.isRecording = false;
  }

  async init() {
    const options = new chrome.Options()
      .addArguments('--start-maximized');

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await this.driver.executeScript(`
      window.recordedActions = [];
      document.addEventListener('click', function(e) {
        window.recordedActions.push({
          type: 'click',
          element: e.target.outerHTML,
          timestamp: Date.now()
        });
      });
    `);
  }

  async cleanup() {
    try {
      if (this.driver) {
        const actions = await this.driver.executeScript('return window.recordedActions');
        await fs.writeFile(
          path.join(__dirname, 'recorded-actions.json'), 
          JSON.stringify(actions, null, 2)
        );
        await this.driver.quit();
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    }
    process.exit();
  }

  async start() {
    try {
      await this.init();
      await this.driver.get('https://www.albertsons.com');
      console.log('Recording started - press Ctrl+C to stop');
      
      process.on('SIGINT', () => this.cleanup());
      
      // Keep alive
      while (true) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      console.error('Recording error:', e);
      await this.cleanup();
    }
  }
}

// Run it
new SeleniumRecorder().start().catch(console.error); 