#!/bin/bash

# Source NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Stopping any running node/vite processes..."
# Kill any node process running vite or the dev server
echo "Stopping any existing servers..."
pkill -f "node.*vite" || true
pkill -f "vite" || true

# Force kill native Windows node processes if they exist (prevents port conflicts)
if command -v taskkill.exe >/dev/null 2>&1; then
    echo "Checking for native Windows node processes..."
    taskkill.exe /F /IM node.exe /T 2>/dev/null || true
fi

# Force kill anything on port 5173 (WSL specific)
echo "Ensuring port 5173 is free..."
if command -v fuser >/dev/null 2>&1; then
    fuser -k 5173/tcp 2>/dev/null || true
fi
if command -v lsof >/dev/null 2>&1; then
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
fi

# Fallback: find and kill by port using netstat or ss if available
if command -v ss >/dev/null 2>&1; then
    ss -lptn 'sport = :5173' | grep -o 'pid=[0-9]*' | cut -d= -f2 | xargs kill -9 2>/dev/null || true
fi

echo "Cleaning Vite cache..."
rm -rf node_modules/.vite

echo "Starting dev server..."
# Start the dev server using the existing script or npm
npm run dev
