FROM node:20-slim

ENV NODE_ENV=production \
    PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

# Create directories and set permissions
WORKDIR /usr/src/app
RUN mkdir -p /opt/render/.cache/puppeteer && \
    mkdir -p /opt/render/project/src/.cache/puppeteer/chrome && \
    chown -R node:node /usr/src/app /opt/render/.cache /opt/render/project

# Copy package files with correct ownership
COPY --chown=node:node package*.json ./
COPY --chown=node:node render-build.sh ./

# Switch to non-root user
USER node

# Run build script
RUN chmod +x render-build.sh && \
    ./render-build.sh

# Copy app files with correct ownership
COPY --chown=node:node . .

EXPOSE 10000
CMD ["node", "index.js"]