FROM node:20-slim

# Install Chrome dependencies
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | tee /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install puppeteer

# Create cache directory and set permissions
RUN mkdir -p /usr/src/app/.cache/puppeteer \
    && chown -R node:node /usr/src/app/.cache

# Copy application files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PUPPETEER_CACHE_DIR=/usr/src/app/.cache/puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Switch to non-root user
USER node

# Expose port
EXPOSE 10000

# Start application
CMD ["node", "index.js"]
