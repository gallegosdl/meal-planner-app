FROM ghcr.io/puppeteer/puppeteer:latest

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    NODE_ENV=production

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install with verbose logging
RUN npm install --verbose

# Copy rest of application
COPY . .

# Add startup logging
RUN echo "Container starting..." > startup.log

# Start with additional logging
CMD echo "Starting server..." && \
    node -v && \
    npm -v && \
    npm start 