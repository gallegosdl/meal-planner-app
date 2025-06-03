FROM ghcr.io/puppeteer/puppeteer:latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Use root temporarily to install dependencies
USER root

# Fix permissions so the non-root user can work
RUN chown -R pptruser:pptruser /app

# Now install dependencies safely as root (package-lock.json needs write)
RUN npm install --omit=dev

# Copy source files
COPY . .

# Ensure app is owned by pptruser
RUN chown -R pptruser:pptruser /app

# Switch to safe user for runtime
USER pptruser

# Expose the port (if needed)
EXPOSE 10000

# Start the app
CMD ["node", "index.js"]