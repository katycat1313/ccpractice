#!/bin/bash

# Build All Apps Script
# This script builds all 4 niche applications

set -e

echo "🚀 Building all niche apps..."
echo ""

# Array of app names
apps=("cold-calling-coach" "interview-prep-pro" "meeting-mastery" "presentation-studio")

# Build each app
for app in "${apps[@]}"; do
  echo "📦 Building $app..."
  cd "apps/$app"
  
  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
  fi
  
  # Build the app
  echo "   Building production bundle..."
  npm run build
  
  # Create dist folder in main directory if it doesn't exist
  mkdir -p "../../dist/$app"
  
  # Copy build output
  echo "   Copying build to dist/$app..."
  cp -r dist/* "../../dist/$app/"
  
  cd ../..
  echo "✅ $app built successfully!"
  echo ""
done

echo "🎉 All apps built successfully!"
echo ""
echo "📁 Built apps are in the ./dist directory:"
echo "   - dist/cold-calling-coach"
echo "   - dist/interview-prep-pro"
echo "   - dist/meeting-mastery"
echo "   - dist/presentation-studio"
echo ""
echo "You can now distribute these folders to your customers!"
