#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Using Node: $(node -v)"
echo "Building Dataset: $(grep 'dataset:' config.js)"

node scripts/build_database.js
