@echo off
REM Hybrid AI Workspace - Quick Setup Script (Windows)
REM This script automates the initial setup process

echo =========================================
echo Hybrid AI Workspace - Setup Script
echo =========================================
echo.

REM Check if Node.js is installed
echo Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo [OK] Node.js found
node -v

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found
    pause
    exit /b 1
)

echo [OK] npm found
npm -v

REM Check if Ollama is installed
echo.
echo Checking Ollama installation...
where ollama >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Ollama found
    set OLLAMA_INSTALLED=1
) else (
    echo [WARNING] Ollama not found. You'll need to install it manually.
    echo Visit: https://ollama.com/download
    set OLLAMA_INSTALLED=0
)

REM Install dependencies
echo.
echo Installing npm dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully

REM Create .env if it doesn't exist
echo.
echo Setting up environment configuration...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [OK] Created .env from .env.example
        echo [WARNING] Please edit .env and add your ANTHROPIC_API_KEY
    ) else (
        echo [WARNING] .env.example not found, creating basic .env
        (
            echo PORT=3001
            echo NODE_ENV=development
            echo LOCAL_LLM_HOST=http://localhost:11434
            echo DEFAULT_EXECUTOR_MODEL=qwen3
            echo ANTHROPIC_API_KEY=
            echo AGENT_MODE=hybrid
            echo SD_API_URL=http://localhost:7860
            echo SD_TIMEOUT=120000
            echo ENABLE_VOICE_INPUT=true
            echo ENABLE_IMAGE_GENERATION=true
            echo ENABLE_PREVIEW=true
            echo ENABLE_AUTO_SUMMARIZE=true
            echo CORS_ORIGIN=http://localhost:5173
        ) > .env
        echo [OK] Created basic .env file
        echo [WARNING] Please add your ANTHROPIC_API_KEY to .env
    )
) else (
    echo [OK] .env file already exists
)

REM Create storage directories
echo.
echo Setting up storage directories...
if not exist context_storage mkdir context_storage
if not exist uploads mkdir uploads
echo [OK] Storage directories created

REM Replace server index if new version exists
echo.
echo Checking server implementation...
if exist server\index.new.ts (
    if exist server\index.ts (
        echo Backing up existing server/index.ts...
        move /Y server\index.ts server\index.old.ts >nul
        echo [OK] Backup created: server/index.old.ts
    )
    move /Y server\index.new.ts server\index.ts >nul
    echo [OK] New server implementation activated
) else (
    echo [OK] Server already up to date
)

REM Pull Ollama model if Ollama is installed
echo.
if %OLLAMA_INSTALLED% EQU 1 (
    echo Checking Ollama models...
    ollama list | findstr /C:"qwen3" >nul
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Qwen 3 model already installed
    ) else (
        echo Qwen 3 model not found. Downloading...
        echo This may take several minutes depending on your internet connection.
        call ollama pull qwen3
        if %ERRORLEVEL% EQU 0 (
            echo [OK] Qwen 3 model installed successfully
        ) else (
            echo [ERROR] Failed to install Qwen 3 model
        )
    )
) else (
    echo [WARNING] Skipping Ollama model check (Ollama not installed)
)

REM Summary
echo.
echo =========================================
echo Setup Complete!
echo =========================================
echo.
echo Next steps:
echo.
echo 1. Edit .env file and add your ANTHROPIC_API_KEY
echo    Get your API key from: https://console.anthropic.com/
echo.
echo 2. (Optional) Install and start Stable Diffusion Web UI
echo    For image generation support
echo.
echo 3. Start the development server:
echo    npm run dev
echo.
echo 4. Open your browser:
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:3001
echo    Health:   http://localhost:3001/api/health
echo.
echo For detailed instructions, see:
echo   - SETUP_GUIDE.md
echo   - ARCHITECTURE.md
echo   - API_DOCUMENTATION.md
echo.
echo Happy coding! 🚀
echo.
pause
