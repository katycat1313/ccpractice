#!/bin/bash

echo "================================"
echo "Update Deepgram API Key"
echo "================================"
echo ""
echo "Current .env.local location:"
echo "/Users/katycat/.claude-worktrees/ccpractice/hungry-goldberg/.env.local"
echo ""
echo "Please enter your Deepgram API key:"
read -r DEEPGRAM_KEY

if [ -z "$DEEPGRAM_KEY" ]; then
  echo "Error: No key entered"
  exit 1
fi

# Update the .env.local file
sed -i.bak "s/VITE_DEEPGRAM_API_KEY=.*/VITE_DEEPGRAM_API_KEY=$DEEPGRAM_KEY/" .env.local

echo ""
echo "✅ Updated successfully!"
echo ""
echo "Updated .env.local:"
cat .env.local
echo ""
echo "Please restart your dev server for changes to take effect"
