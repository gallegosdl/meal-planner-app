# Use full Node base image
FROM node:20-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    fonts-liberation libasound2 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Create app directory and user
RUN mkdir -p /app && \
    groupadd -r pptruser && \
    useradd -r -g pptruser -G audio,video pptruser && \
    mkdir -p /home/pptruser && \
    chown -R pptruser:pptruser /home/pptruser && \
    chown -R pptruser:pptruser /app

# Set working dir
WORKDIR /app

# Switch to user
USER pptruser

# Create and set permissions for Chrome cache dir
RUN mkdir -p /home/pptruser/.cache/puppeteer && \
    chmod -R 777 /home/pptruser/.cache/puppeteer

# Copy files first
COPY package*.json ./
RUN npm ci && \
    npx puppeteer browsers install chrome && \
    ls -la $(npm root)/puppeteer/.local-chromium/linux-*/chrome-linux/chrome

COPY . .

# Set Chrome path to installed location
ENV PUPPETEER_EXECUTABLE_PATH=$(npm root)/puppeteer/.local-chromium/linux-*/chrome-linux/chrome

# Expose port
EXPOSE 10000

# Start app
CMD ["node", "index.js"]
