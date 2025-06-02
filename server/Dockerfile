FROM node:18-slim

# Install dependencies
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

# Create cache directory with correct permissions
RUN mkdir -p /tmp/.puppeteer && chmod -R 777 /tmp/.puppeteer

# Set environment variables
ENV PUPPETEER_SKIP_DOWNLOAD=false \
    PUPPETEER_CACHE_DIR=/tmp/.puppeteer

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Copy app source
COPY . .

# Add user
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && chown -R pptruser:pptruser /usr/src/app \
    && chown -R pptruser:pptruser /tmp/.puppeteer

USER pptruser

EXPOSE 3001

CMD ["npm", "start"] 