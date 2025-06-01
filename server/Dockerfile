FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root to install dependencies
USER root

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false \
    NODE_ENV=production \
    PUPPETEER_CACHE_DIR=/usr/src/app/.cache/puppeteer

# Create and set permissions for Puppeteer cache directory
RUN mkdir -p /usr/src/app/.cache/puppeteer && \
    chown -R pptruser:pptruser /usr/src/app/.cache/puppeteer

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies and Chromium
RUN npm install -g npm@latest && \
    npm ci --quiet && \
    node node_modules/puppeteer/install.js && \
    chown -R pptruser:pptruser /usr/src/app

# Copy rest of application
COPY . .

# Switch back to non-root user
USER pptruser

# Expose the port
EXPOSE 3001

CMD ["npm", "start"] 