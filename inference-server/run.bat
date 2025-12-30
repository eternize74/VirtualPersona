@echo off
echo ========================================
echo  LivePortrait Inference Server
echo ========================================
echo.

REM Check if venv exists
if not exist venv (
    echo [ERROR] Virtual environment not found!
    echo Please run setup.bat first.
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

echo [INFO] Starting server on http://0.0.0.0:8765
echo [INFO] WebSocket endpoint: ws://localhost:8765/ws
echo [INFO] Press Ctrl+C to stop
echo.

python server.py
