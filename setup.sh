#!/bin/bash

# Hybrid AI Workspace - Quick Setup Script
# This script automates the initial setup process

set -e

echo "========================================="
echo "Hybrid AI Workspace - Setup Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗ Node.js version 18 or higher required. Current: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v) found${NC}"

# Check if Ollama is installed
echo ""
echo "Checking Ollama installation..."
if command -v ollama &> /dev/null; then
    echo -e "${GREEN}✓ Ollama found${NC}"
    OLLAMA_INSTALLED=true
else
    echo -e "${YELLOW}! Ollama not found. You'll need to install it manually.${NC}"
    echo "  Visit: https://ollama.com/download"
    OLLAMA_INSTALLED=false
fi

# Install dependencies
echo ""
echo "Installing npm dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

# Create .env if it doesn't exist
echo ""
echo "Setting up environment configuration..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
        echo -e "${YELLOW}! Please edit .env and add your ANTHROPIC_API_KEY${NC}"
    else
        echo -e "${YELLOW}! .env.example not found, creating basic .env${NC}"
        cat > .env << EOL
PORT=3001
NODE_ENV=development
LOCAL_LLM_HOST=http://localhost:11434
DEFAULT_EXECUTOR_MODEL=qwen3
ANTHROPIC_API_KEY=
AGENT_MODE=hybrid
SD_API_URL=http://localhost:7860
SD_TIMEOUT=120000
ENABLE_VOICE_INPUT=true
ENABLE_IMAGE_GENERATION=true
ENABLE_PREVIEW=true
ENABLE_AUTO_SUMMARIZE=true
CORS_ORIGIN=http://localhost:5173
EOL
        echo -e "${GREEN}✓ Created basic .env file${NC}"
        echo -e "${YELLOW}! Please add your ANTHROPIC_API_KEY to .env${NC}"
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Create context storage directory
echo ""
echo "Setting up storage directories..."
mkdir -p context_storage
mkdir -p uploads
echo -e "${GREEN}✓ Storage directories created${NC}"

# Replace server index if new version exists
echo ""
echo "Checking server implementation..."
if [ -f server/index.new.ts ]; then
    if [ -f server/index.ts ]; then
        echo "Backing up existing server/index.ts..."
        mv server/index.ts server/index.old.ts
        echo -e "${GREEN}✓ Backup created: server/index.old.ts${NC}"
    fi
    mv server/index.new.ts server/index.ts
    echo -e "${GREEN}✓ New server implementation activated${NC}"
else
    echo -e "${GREEN}✓ Server already up to date${NC}"
fi

# Pull Ollama model if Ollama is installed
echo ""
if [ "$OLLAMA_INSTALLED" = true ]; then
    echo "Checking Ollama models..."
    if ollama list | grep -q "qwen3"; then
        echo -e "${GREEN}✓ Qwen 3 model already installed${NC}"
    else
        echo "Qwen 3 model not found. Downloading..."
        echo "This may take several minutes depending on your internet connection."
        ollama pull qwen3
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Qwen 3 model installed successfully${NC}"
        else
            echo -e "${RED}✗ Failed to install Qwen 3 model${NC}"
        fi
    fi
else
    echo -e "${YELLOW}! Skipping Ollama model check (Ollama not installed)${NC}"
fi

# Summary
echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit .env file and add your ANTHROPIC_API_KEY"
echo "   Get your API key from: https://console.anthropic.com/"
echo ""
echo "2. (Optional) Install and start Stable Diffusion Web UI"
echo "   For image generation support"
echo ""
echo "3. Start the development server:"
echo "   npm run dev"
echo ""
echo "4. Open your browser:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo "   Health:   http://localhost:3001/api/health"
echo ""
echo "For detailed instructions, see:"
echo "  - SETUP_GUIDE.md"
echo "  - ARCHITECTURE.md"
echo "  - API_DOCUMENTATION.md"
echo ""
echo "Happy coding! 🚀"
echo ""
