FROM ghcr.io/puppeteer/puppeteer:latest

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    NODE_ENV=production

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy rest of application
COPY . .

# Expose the port
EXPOSE 3001

CMD ["npm", "start"] 