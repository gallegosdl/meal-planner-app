FROM node:20-slim

# Install OS dependencies for Chromium
RUN apt-get update && apt-get install -y \
  wget \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# ✅ Install Chromium with Puppeteer's built-in installer
RUN npx puppeteer browsers install chrome

# ✅ Make sure Puppeteer knows where the browser is
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy application files
COPY . .

# Expose port
EXPOSE 10000

# Runtime environment
ENV NODE_ENV=production

# Start application
CMD ["node", "index.js"]
