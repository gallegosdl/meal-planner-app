FROM ghcr.io/puppeteer/puppeteer:latest

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false \
    NODE_ENV=production

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends

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