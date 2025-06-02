# Use slim Node base image
FROM node:20-slim

# Install required system dependencies for Chromium to run in headless mode
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
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Set environment variable to ensure Chromium is downloaded
ENV PUPPETEER_SKIP_DOWNLOAD=false

# Set work directory
WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

ENV PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

# Install dependencies (including puppeteer, which downloads Chromium here)
RUN npm install

# Copy application source
COPY . .

# Expose the desired port
EXPOSE 3001

# Start the app
CMD ["npm", "start"]
