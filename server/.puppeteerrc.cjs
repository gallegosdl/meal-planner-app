const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: '/opt/render/.cache/puppeteer',
  executablePath: '/usr/bin/google-chrome'
}; 