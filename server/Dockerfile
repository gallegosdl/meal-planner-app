FROM node:20-slim

# Set environment variables for Render
ENV PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer \
    NODE_ENV=production \
    CHROME_PATH=/usr/bin/google-chrome

# Install Chrome and dependencies
RUN apt-get update && apt-get install -y wget gnupg2 && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 10000

# Start application
CMD ["node", "index.js"]