#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧬 Setting up LLM DNA Explorer Environment...${NC}"

# 1. Check/Install Node.js
if ! command -v node &> /dev/null; then
    echo -e "${BLUE}Node.js not found. Installing via NVM...${NC}"
    
    # Install NVM if not present
    if [ ! -d "$HOME/.nvm" ]; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    # Install Node LTS
    nvm install --lts
    nvm use --lts
else
    echo -e "${GREEN}✓ Node.js $(node -v) is already installed${NC}"
fi

# 2. Install Dependencies
echo -e "${BLUE}Installing project dependencies...${NC}"
npm install

# 3. Build Data
echo -e "${BLUE}Building DNA database...${NC}"
npm run build:data

echo -e "${GREEN}✓ Environment setup complete!${NC}"
echo -e "${BLUE}You can now run the development server with:${NC}"
echo -e "  npm run dev"
