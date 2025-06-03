FROM node:20

WORKDIR /app/server

# Copy package.json and package-lock.json from server directory
COPY server/package*.json ./

RUN rm -rf node_modules package-lock.json && npm cache clean --force

# Install dependencies (downloads Chromium for Puppeteer)
RUN npm install

RUN npm ls

# Copy the rest of your server code
COPY server/. .

RUN npm uninstall puppeteer-core || true

RUN find /app -name "*puppeteer-core*" || echo "No puppeteer-core found"

# (Optional) Set Puppeteer cache dir, helps on Render
ENV PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

EXPOSE 10000

CMD ["node", "index.js"]