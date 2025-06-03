FROM node:20

WORKDIR /app/server

# Copy package.json and package-lock.json from server directory
COPY server/package*.json ./

# Install dependencies (downloads Chromium for Puppeteer)
RUN npm install

# Copy the rest of your server code
COPY server/. .

# (Optional) Set Puppeteer cache dir, helps on Render
ENV PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

EXPOSE 10000

CMD ["node", "index.js"]