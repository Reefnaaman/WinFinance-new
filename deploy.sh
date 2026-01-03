#!/bin/bash

# Bulletproof deployment script for WinFinance Lead Management
# This bypasses all Vercel integration issues

echo "🚀 Starting bulletproof deployment..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Vercel CLI...${NC}"
    npm install -g vercel@latest
fi

# Clean install dependencies
echo -e "${YELLOW}🧹 Cleaning and installing dependencies...${NC}"
rm -rf node_modules package-lock.json .next
npm install

# Verify clsx is installed
if npm ls clsx &> /dev/null; then
    echo -e "${GREEN}✅ clsx is properly installed${NC}"
else
    echo -e "${RED}❌ clsx not found, installing...${NC}"
    npm install clsx
fi

# Test build locally
echo -e "${YELLOW}🔨 Testing build locally...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Local build successful${NC}"
else
    echo -e "${RED}❌ Local build failed${NC}"
    exit 1
fi

# Deploy to Vercel
echo -e "${YELLOW}🚀 Deploying to Vercel...${NC}"
if vercel --prod --yes; then
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo -e "${GREEN}Your app is live at: https://winfinance.co.il${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✨ All done! Your app should be live in 1-2 minutes.${NC}"