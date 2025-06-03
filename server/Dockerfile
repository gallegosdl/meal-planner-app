# Use full Node base image
FROM node:20-slim

# Install Chrome dependencies only (not Chrome itself)
RUN apt-get update && apt-get install -y \
    fonts-liberation libasound2 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    # Create cache directory with correct permissions
    mkdir -p /root/.cache/puppeteer && \
    chmod -R 777 /root/.cache/puppeteer

# Set working dir
WORKDIR /app

# Copy files and install deps
COPY package*.json ./
RUN npm ci && \
    # Verify Chrome installation
    ls -la /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome

COPY . .

# Point to Puppeteer's Chrome and set other required vars
ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/root/.cache/puppeteer/chrome/linux-136.0.7103.94/chrome-linux64/chrome \
    PUPPETEER_CACHE_DIR=/root/.cache/puppeteer

# Expose port
EXPOSE 10000

# Start app
CMD ["node", "index.js"]
