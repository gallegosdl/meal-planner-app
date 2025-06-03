# Use Puppeteer's official Docker image with Chromium pre-installed
FROM ghcr.io/puppeteer/puppeteer:latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies as root (to avoid EACCES)
RUN npm install --omit=dev

# Copy application source
COPY . .

# Use non-root user for runtime (safer)
USER pptruser

# Expose app port (adjust as needed)
EXPOSE 10000

# Start your app
CMD ["node", "index.js"]