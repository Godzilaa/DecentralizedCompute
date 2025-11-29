#!/bin/bash

# Setup script for Shelby Compute Frontend
# This script installs Node.js in WSL and sets up the project

set -e  # Exit on error

echo "🚀 Setting up Shelby Compute Frontend..."
echo ""

# Check if we're using Windows npm (bad)
NPM_PATH=$(which npm 2>/dev/null || echo "not found")
if [[ "$NPM_PATH" == *"/mnt/c/"* ]]; then
    echo "⚠️  WARNING: You're using Windows npm, which causes issues in WSL"
    echo "📦 Installing Node.js in WSL..."
    
    # Install Node.js 20.x in WSL
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    echo "✅ Node.js installed in WSL"
    echo ""
fi

# Verify Node.js installation
echo "📋 Checking Node.js version..."
node --version
npm --version
echo ""

# Navigate to project directory
cd /home/athma/aptos/DecentralizedCompute/compute-frontend

# Clean up any existing node_modules
if [ -d "node_modules" ]; then
    echo "🧹 Cleaning up existing node_modules..."
    rm -rf node_modules
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 To start the development server, run:"
echo "   cd /home/athma/aptos/DecentralizedCompute/compute-frontend"
echo "   npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
