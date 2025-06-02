FROM ghcr.io/puppeteer/puppeteer:19.7.2

ENV NODE_ENV=production \
    PUPPETEER_CACHE_DIR=/tmp/.puppeteer \
    PUPPETEER_SKIP_DOWNLOAD=false

WORKDIR /usr/src/app

# Verify Chrome installation and cache directory
RUN echo "Chrome paths:" && \
    which google-chrome || echo "google-chrome not found" && \
    which google-chrome-stable || echo "google-chrome-stable not found" && \
    mkdir -p /tmp/.puppeteer && \
    chmod -R 777 /tmp/.puppeteer

COPY package*.json ./
RUN npm ci
COPY . .

EXPOSE 10000
CMD ["node", "index.js"]