@echo off
echo ========================================
echo  LivePortrait Inference Server Setup
echo  (with FasterLivePortrait integration)
echo ========================================
echo.

REM Check Python 3.10
py -3.10 --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3.10 not found!
    echo Please install Python 3.10 from:
    echo https://www.python.org/downloads/release/python-31011/
    pause
    exit /b 1
)

echo [OK] Python 3.10 found

REM Create virtual environment
if exist venv (
    echo [INFO] Virtual environment already exists
) else (
    echo [INFO] Creating virtual environment...
    py -3.10 -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Upgrade pip
echo [INFO] Upgrading pip...
python -m pip install --upgrade pip --quiet

REM Install PyTorch with CUDA
echo [INFO] Installing PyTorch with CUDA support...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

REM Install basic dependencies
echo [INFO] Installing dependencies...
pip install -r requirements.txt

REM Clone FasterLivePortrait if not exists
if exist FasterLivePortrait (
    echo [OK] FasterLivePortrait already cloned
) else (
    echo [INFO] Cloning FasterLivePortrait...
    git clone https://github.com/warmshao/FasterLivePortrait
)

REM Install FasterLivePortrait dependencies
echo [INFO] Installing FasterLivePortrait dependencies...
pip install -r FasterLivePortrait/requirements.txt --quiet 2>nul

REM Download models if not exists
if exist checkpoints\liveportrait_onnx (
    echo [OK] Models already downloaded
) else (
    echo [INFO] Downloading models...
    python download_models.py
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo To run the server:
echo   .\run.bat
echo.
pause
