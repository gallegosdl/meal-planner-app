FROM node:18-slim

# Install Chrome dependencies
RUN apt-get update \
    && apt-get install -y \
       wget \
       ca-certificates \
       fonts-liberation \
       libappindicator3-1 \
       libasound2 \
       libatk-bridge2.0-0 \
       libatk1.0-0 \
       libcups2 \
       libdbus-1-3 \
       libgdk-pixbuf2.0-0 \
       libnspr4 \
       libnss3 \
       libxcomposite1 \
       libxdamage1 \
       libxrandr2 \
       xdg-utils \
       libu2f-udev \
       libvulkan1 \
       libxss1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

COPY server/package*.json ./
RUN npm install

COPY server/. ./

ENV NODE_ENV=production

# Puppeteer will download its own Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=false

# Expose your server port (change if not 10000)
EXPOSE 10000

CMD ["node", "index.js"]