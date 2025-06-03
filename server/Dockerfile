# Use full Node base image
FROM node:20-slim

# Install Chrome
RUN apt-get update && apt-get install -y wget gnupg2 && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable

WORKDIR /app

# Copy files and install deps
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 10000
CMD ["node", "index.js"]
