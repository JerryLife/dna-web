#!/bin/bash

# Source NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Navigate to project
cd "$(dirname "$0")/.."

# Start dev server
echo "Starting dev server..."
npm run dev -- --host
