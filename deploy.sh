#!/bin/bash
# deploy.sh - One-click deployment script for LLM DNA Explorer
# Run this from WSL: ./deploy.sh

set -e

echo "🚀 LLM DNA Explorer - Docker Deployment"
echo "========================================"

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available"
    exit 1
fi

echo "📦 Stopping existing containers..."
docker compose down 2>/dev/null || true

# echo "🧬 Building DNA databases..."
# npm run build:data

echo "🔨 Building containers..."
docker compose build --no-cache

echo "🚀 Starting containers..."
docker compose up -d

echo ""
echo "✅ Deployment complete!"
echo ""
echo "   Frontend: http://localhost:3000"
echo "   Health:   http://localhost:3000/api/health"
echo ""
echo "📋 Useful commands:"
echo "   View logs:    docker compose logs -f"
echo "   Stop:         docker compose down"
echo "   Restart:      docker compose restart"
echo ""
