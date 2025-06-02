# Use full Node base image
FROM node:20-slim

# Add required tools for Chrome to run
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates fonts-liberation libasound2 libatk1.0-0 \
    libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgbm1 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libx11-6 libx11-xcb1 \
    libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 \
    libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
    libxtst6 xdg-utils --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set working dir
WORKDIR /app

# Copy files
COPY package*.json ./
COPY ./ ./

# Install Puppeteer and its downloaded Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
RUN npm install

# Expose and start
EXPOSE 3000
CMD [ "npm", "start" ]
