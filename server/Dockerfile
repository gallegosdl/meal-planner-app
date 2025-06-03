FROM ghcr.io/puppeteer/puppeteer:latest

# Use root to install
USER root

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Set permissions for runtime
RUN chown -R pptruser:pptruser /app

# Drop to non-root user
USER pptruser

CMD ["node", "server/index.js"]
