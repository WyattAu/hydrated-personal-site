#!/usr/bin/env bash
# Deploy to Netlify
# Requires: NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID environment variables
# Or: netlify login + netlify link

set -euo pipefail

echo "Building site..."
cd apps/site
bun run build

echo "Deploying to Netlify..."
if command -v netlify &> /dev/null; then
    netlify deploy --prod --dir=dist
elif command -v npx &> /dev/null; then
    npx netlify-cli deploy --prod --dir=dist
else
    echo "Error: netlify CLI not found. Install with: npm install -g netlify-cli"
    echo "Then run: netlify login && netlify link"
    exit 1
fi
