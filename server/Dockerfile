FROM node:20-slim

# Puppeteer cache dir must match runtime path
ENV PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

# Install dependencies for Chromium
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

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install and bake Chrome into the exact path Puppeteer expects
RUN npm install && \
    npx puppeteer browsers install chrome && \
    chmod -R 777 /opt/render/.cache/puppeteer

# Copy application files
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 10000

# Start application
CMD ["node", "index.js"]