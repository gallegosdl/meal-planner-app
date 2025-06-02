FROM node:20-slim

# Set cache dir first so all commands use it
ENV PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer \
    NODE_ENV=production

# Install Chrome dependencies
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

# Create cache directory with proper permissions
RUN mkdir -p /opt/render/.cache/puppeteer && \
    chmod -R 777 /opt/render/.cache/puppeteer

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies and Chrome
RUN npm install && \
    npx puppeteer browsers install chrome

# Copy application files
COPY . .

# Expose port
EXPOSE 10000

# Start application
CMD ["node", "index.js"]