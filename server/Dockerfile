FROM node:20-slim

# Set cache dir and env vars
ENV PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer \
    NODE_ENV=production

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros \
    fonts-kacst fonts-freefont-ttf dbus dbus-x11 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies and Chrome in correct location
RUN mkdir -p /opt/render/.cache/puppeteer && \
    npm install && \
    npx puppeteer browsers install chrome && \
    chmod -R 777 /opt/render/.cache/puppeteer

# Copy application files
COPY . .

# Expose port
EXPOSE 10000

# Start application
CMD ["node", "index.js"]