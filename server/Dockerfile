FROM ghcr.io/puppeteer/puppeteer:19.0.0

USER root

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Grant permissions
RUN chown -R pptruser:pptruser /usr/src/app

# Use built-in puppeteer user
USER pptruser

EXPOSE 3001

CMD ["npm", "start"] 