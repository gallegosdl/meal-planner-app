FROM node:20-slim

# Install Chrome dependencies and Chrome itself
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | tee /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install Chromium using Puppeteer's browser installer
RUN mkdir -p /opt/render/.cache/puppeteer \
    && chmod -R 777 /opt/render/.cache/puppeteer \
    && npx puppeteer browsers install chrome \
    && chmod -R 777 /opt/render/.cache/puppeteer

# Copy application files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

# Expose port
EXPOSE 10000

# Start application
CMD ["node", "index.js"]
