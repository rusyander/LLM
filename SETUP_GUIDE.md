# Setup Guide

## Hybrid AI Workspace Application

**Production-Ready MVP Setup Instructions**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Configuration](#configuration)
4. [Running the Application](#running-the-application)
5. [Optional Components](#optional-components)
6. [Troubleshooting](#troubleshooting)
7. [Development Workflow](#development-workflow)

---

## Prerequisites

### Required Software

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 or **yarn** >= 1.22.0
- **Git**

### Operating System

- Windows 11 (primary)
- Also compatible with: macOS, Linux

### Hardware Requirements

**Minimum:**

- 8GB RAM
- 10GB free disk space
- 2-core CPU

**Recommended:**

- 16GB+ RAM
- 50GB+ free disk space (for models and generated content)
- 4+ core CPU
- GPU (for Stable Diffusion)

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd LLM
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages:

- Backend: Express, Ollama SDK, Anthropic SDK, etc.
- Frontend: React, Vite, Zustand, etc.
- Development: TypeScript, TSX, Concurrently

### 3. Install Ollama (Local LLM)

#### Windows:

```bash
# Download and install from https://ollama.com/download
# Or use winget
winget install Ollama.Ollama
```

#### macOS:

```bash
brew install ollama
```

#### Linux:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 4. Pull Qwen 3 Model

```bash
ollama pull qwen3
```

**Alternative models (optional):**

```bash
ollama pull llama3        # For comparison
ollama pull codellama     # Code-focused
ollama pull mistral       # Lightweight alternative
```

### 5. Verify Ollama Installation

```bash
ollama list
# Should show qwen3 in the list

curl http://localhost:11434/api/tags
# Should return JSON with available models
```

---

## Configuration

### 1. Create Environment File

Create `.env` in the project root:

```bash
# Copy from example
cp .env.example .env
```

### 2. Edit `.env` File

```env
# ============================================================================
# SERVER CONFIGURATION
# ============================================================================
PORT=3001
NODE_ENV=development

# ============================================================================
# LLM CONFIGURATION
# ============================================================================

# Local LLM (Ollama)
LOCAL_LLM_HOST=http://localhost:11434
DEFAULT_EXECUTOR_MODEL=qwen3

# Cloud LLM (Claude)
ANTHROPIC_API_KEY=your_api_key_here
# Get your API key from: https://console.anthropic.com/

# Agent Mode: "local_only" | "hybrid"
AGENT_MODE=hybrid

# ============================================================================
# STABLE DIFFUSION CONFIGURATION (Optional)
# ============================================================================
SD_API_URL=http://localhost:7860
SD_TIMEOUT=120000

# ============================================================================
# STORAGE CONFIGURATION
# ============================================================================
CONTEXT_STORAGE_DIR=./context_storage
MAX_CHAT_SIZE=104857600      # 100MB per chat
MAX_TOTAL_SIZE=1073741824    # 1GB total storage

# ============================================================================
# FEATURE FLAGS
# ============================================================================
ENABLE_VOICE_INPUT=true
ENABLE_IMAGE_GENERATION=true
ENABLE_PREVIEW=true
ENABLE_AUTO_SUMMARIZE=true

# ============================================================================
# SECURITY
# ============================================================================
CORS_ORIGIN=http://localhost:5173
```

### 3. Environment Variables Explained

| Variable                 | Description               | Required        | Default                |
| ------------------------ | ------------------------- | --------------- | ---------------------- |
| `PORT`                   | Server port               | No              | 3001                   |
| `LOCAL_LLM_HOST`         | Ollama API endpoint       | Yes             | http://localhost:11434 |
| `DEFAULT_EXECUTOR_MODEL` | Default local model       | Yes             | qwen3                  |
| `ANTHROPIC_API_KEY`      | Claude API key            | For hybrid mode | -                      |
| `AGENT_MODE`             | Operating mode            | No              | hybrid                 |
| `SD_API_URL`             | Stable Diffusion endpoint | For images      | http://localhost:7860  |

---

## Running the Application

### Development Mode (Recommended for testing)

```bash
npm run dev
```

This starts:

- **Backend server** on http://localhost:3001 (hot reload with tsx)
- **Frontend dev server** on http://localhost:5173 (hot reload with Vite)

### Production Build

```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

### Individual Components

```bash
# Backend only
npm run server

# Frontend only
npm run client

# Preview production build
npm run preview
```

---

## Optional Components

### Stable Diffusion Integration

To enable image generation capabilities:

#### 1. Install AUTOMATIC1111 Web UI

```bash
# Clone repository
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Windows: Run installer
webui-user.bat

# Linux/Mac:
./webui.sh
```

#### 2. Download Stable Diffusion Model

Place models in `stable-diffusion-webui/models/Stable-diffusion/`:

- **Recommended:** [sd_xl_base_1.0.safetensors](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0)
- **Alternative:** [sd-v1-5.safetensors](https://huggingface.co/runwayml/stable-diffusion-v1-5)

#### 3. Enable API Access

Edit `stable-diffusion-webui/webui-user.bat` (Windows) or `webui-user.sh` (Linux/Mac):

```bash
set COMMANDLINE_ARGS=--api --listen
```

#### 4. Verify SD Installation

```bash
curl http://localhost:7860/sdapi/v1/sd-models
# Should return list of available models
```

---

## Troubleshooting

### Ollama Not Running

**Error:** `Failed to connect to Ollama`

**Solution:**

```bash
# Check if Ollama is running
ollama serve

# On Windows, check if Ollama service is running:
# Services -> Ollama -> Start
```

### Claude API Key Issues

**Error:** `Claude service not available`

**Solution:**

1. Verify API key is correct in `.env`
2. Check API key has credits: https://console.anthropic.com/
3. Test API key:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model": "claude-sonnet-4", "max_tokens": 10, "messages": [{"role": "user", "content": "Hi"}]}'
```

### Port Already in Use

**Error:** `Port 3001 already in use`

**Solution:**

```bash
# Windows: Find and kill process
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3001 | xargs kill -9

# Or change port in .env:
PORT=3002
```

### Stable Diffusion Not Available

**Error:** `Stable Diffusion service not available`

**Solution:**

1. Ensure SD Web UI is running: http://localhost:7860
2. Check `--api` flag is enabled in launch args
3. Verify in browser: http://localhost:7860/docs (API documentation)

### TypeScript Errors

**Error:** Various TypeScript compilation errors

**Solution:**

```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript version
npx tsc --version

# Rebuild
npm run build
```

### Context Storage Issues

**Error:** `Failed to initialize storage`

**Solution:**

```bash
# Create directory manually
mkdir context_storage

# Check permissions
# Windows: Right-click -> Properties -> Security
# Linux/Mac: chmod 755 context_storage
```

---

## Development Workflow

### Project Structure

```
LLM/
├── server/               # Backend Node.js/Express
│   ├── index.ts         # Main server file
│   ├── config.ts        # Configuration
│   ├── types.ts         # TypeScript types
│   └── services/        # Business logic
│       ├── agentOrchestrator.ts
│       ├── contextManager.ts
│       ├── claudeService.ts
│       ├── ollamaService.ts
│       ├── stableDiffusionService.ts
│       ├── voiceService.ts
│       └── previewService.ts
├── src/                 # Frontend React
│   ├── App.tsx
│   ├── components/
│   ├── store/
│   └── utils/
├── context_storage/     # Persistent chat data
├── uploads/            # Temporary file uploads
├── dev-log.md          # Development log
├── ARCHITECTURE.md     # System architecture
├── DATA_SCHEMAS.md     # Data schemas
└── SETUP.md            # This file
```

### Adding a New Feature

1. **Design:** Document in ARCHITECTURE.md
2. **Schema:** Define data structures in DATA_SCHEMAS.md
3. **Backend:** Implement service in `server/services/`
4. **API:** Add endpoint in `server/index.ts`
5. **Frontend:** Create components in `src/components/`
6. **Test:** Verify end-to-end functionality
7. **Log:** Update dev-log.md

### Code Style

- **TypeScript:** Strict mode enabled
- **Linting:** ESLint (extend as needed)
- **Formatting:** 2-space indentation
- **Naming:** camelCase for variables, PascalCase for components

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: description"

# Push and create PR
git push origin feature/your-feature
```

### Debugging

#### Backend (Node.js)

```bash
# Using VSCode debugger
# Add to .vscode/launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Server",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "server"],
  "skipFiles": ["<node_internals>/**"]
}
```

#### Frontend (React)

- Use React DevTools extension
- Console logging: `console.log()`
- Zustand DevTools (built-in)

---

## Verification Checklist

After setup, verify each component:

- [ ] Node.js installed and version >= 18
- [ ] Dependencies installed (`node_modules` exists)
- [ ] `.env` file created and configured
- [ ] Ollama running and accessible
- [ ] Qwen 3 model downloaded
- [ ] Claude API key configured (for hybrid mode)
- [ ] Backend starts without errors
- [ ] Frontend loads in browser
- [ ] Can create new chat
- [ ] Can send message and receive response
- [ ] Context storage directory created
- [ ] (Optional) Stable Diffusion accessible
- [ ] (Optional) Image generation works

---

## Next Steps

After successful setup:

1. **Read ARCHITECTURE.md** - Understand the system design
2. **Review DATA_SCHEMAS.md** - Learn the data structures
3. **Check dev-log.md** - See development progress
4. **Explore the UI** - Create chats, test features
5. **Monitor logs** - Watch console for errors
6. **Try voice input** - Test Web Speech API integration
7. **Generate images** - Test Stable Diffusion (if enabled)
8. **Review context files** - Inspect `context_storage/` directory

---

## Support

If you encounter issues not covered in troubleshooting:

1. Check console logs (browser and terminal)
2. Review error-log.md for similar issues
3. Verify all prerequisites are met
4. Test each component individually
5. Check GitHub issues (if applicable)

---

## License

[Specify license here]

## Contributors

[List contributors here]

---

**Last Updated:** January 18, 2026
**Version:** 1.0.0-MVP
