#!/bin/bash

# Alternative deployment to Netlify (backup solution)
# Use this if Vercel continues to have issues

echo "🚀 Deploying to Netlify as backup..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Netlify CLI...${NC}"
    npm install -g netlify-cli
fi

# Clean install dependencies
echo -e "${YELLOW}🧹 Cleaning and installing dependencies...${NC}"
rm -rf node_modules package-lock.json .next
npm install

# Test build locally
echo -e "${YELLOW}🔨 Building for production...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Deploy to Netlify
echo -e "${YELLOW}🚀 Deploying to Netlify...${NC}"
echo -e "${YELLOW}Note: You'll need to configure your domain manually in Netlify dashboard${NC}"

if netlify deploy --prod --dir .next; then
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo -e "${GREEN}Your app is live! Check the Netlify dashboard for the URL.${NC}"
    echo -e "${YELLOW}Don't forget to:${NC}"
    echo -e "${YELLOW}1. Add your environment variables in Netlify dashboard${NC}"
    echo -e "${YELLOW}2. Configure winfinance.co.il domain in Netlify${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi