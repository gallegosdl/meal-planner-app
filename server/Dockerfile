FROM ghcr.io/puppeteer/puppeteer:21.5.0

# Set environment variables
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install as pptruser
USER pptruser
RUN npm install

# Copy rest of the files
COPY --chown=pptruser:pptruser . .

# Expose port
EXPOSE 10000

# Start application
CMD ["node", "index.js"]