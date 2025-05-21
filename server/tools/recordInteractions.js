const puppeteer = require('puppeteer-extra');
const RecorderPlugin = require('puppeteer-recorder');

puppeteer.use(RecorderPlugin());

async function recordInteractions() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null 
  });
  
  const page = await browser.newPage();
  
  // Start recording
  await page.recordInteractions({
    outputFile: './recorded-steps.js',
    includeSelectors: true
  });
  
  // Navigate to site
  await page.goto('https://www.albertsons.com');
  
  // Wait for manual interaction
  console.log('Perform the manual steps you want to record. Press Ctrl+C when done.');
  
  // Keep browser open
  await new Promise(() => {});
}

recordInteractions().catch(console.error); 