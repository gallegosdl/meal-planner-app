# Use Puppeteer's Chromium-ready base image
FROM ghcr.io/puppeteer/puppeteer:latest

# Set working directory inside the container
WORKDIR /app

# Copy package.json and lock file for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application files
COPY . .

# Expose a port if you're running a web server (optional)
# EXPOSE 3000

# Start the application
CMD ["node", "index.js"]
