#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
npm ci

# Set up cache directories
PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
BUILD_CACHE_DIR=/opt/render/project/src/.cache/puppeteer/chrome
mkdir -p $PUPPETEER_CACHE_DIR
mkdir -p $BUILD_CACHE_DIR

# Install Chrome
PUPPETEER_CACHE_DIR=$PUPPETEER_CACHE_DIR npx puppeteer browsers install chrome

# Store Chrome in build cache
if [ -d "$PUPPETEER_CACHE_DIR/chrome" ]; then
  echo "...Storing Chrome in Build Cache"
  cp -R $PUPPETEER_CACHE_DIR/chrome/* $BUILD_CACHE_DIR/
fi 