#!/bin/bash

echo "🚀 Deploying to Vercel..."

# Build locally first to ensure it works
echo "📦 Building project locally..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"

    echo "🌐 Deploying to Vercel..."
    # Deploy to production without prompts
    vercel --prod --yes

    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
        echo "🌐 Your site should be live at https://winfinance.co.il"
    else
        echo "❌ Deployment failed. Trying alternative method..."
        # Alternative: Deploy as new project
        vercel --prod --name win-finance-manual --yes
    fi
else
    echo "❌ Build failed. Please fix build errors first."
    exit 1
fi