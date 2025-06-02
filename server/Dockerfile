# Use full Node base image
FROM node:20-slim

# Install Chrome
RUN apt-get update && apt-get install -y wget gnupg2 && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable \
    fonts-liberation libasound2 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    # Verify Chrome installation and symlinks
    google-chrome --version && \
    ls -la /usr/bin/google-chrome && \
    ls -la /etc/alternatives/google-chrome && \
    # Create direct symlink to actual binary
    ln -sf $(readlink -f /usr/bin/google-chrome) /usr/bin/chrome

# Set working dir
WORKDIR /app

# Copy files and install deps
COPY package*.json ./
RUN npm ci

COPY . .

# Set Chrome path to our direct symlink
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chrome

# Expose and start
EXPOSE 3000
CMD [ "npm", "start" ]
