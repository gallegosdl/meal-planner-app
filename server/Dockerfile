FROM ghcr.io/puppeteer/puppeteer:21.5.0

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_ENV=production

WORKDIR /usr/src/app

# Copy package files and set correct ownership
COPY --chown=pptruser:pptruser package*.json ./

# Install as pptruser
USER pptruser
RUN npm install

# Copy rest of the files with correct ownership
COPY --chown=pptruser:pptruser . .

EXPOSE 10000

CMD ["node", "index.js"]
