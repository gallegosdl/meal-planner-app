# Use full Node base image
FROM node:20-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    fonts-liberation libasound2 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy files and install deps
COPY package*.json ./
RUN npm ci

COPY . .

# Let Puppeteer handle Chrome
ENV PUPPETEER_SKIP_DOWNLOAD=false

EXPOSE 10000
CMD ["node", "index.js"]
