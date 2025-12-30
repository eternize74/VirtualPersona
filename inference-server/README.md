# LivePortrait Inference Server

Real-time face animation inference server using FastAPI + WebSocket.

## Requirements

- **Python 3.10** (Required - 3.11+ not fully supported)
- ONNX Runtime
- FastAPI

## Quick Start

### Windows

```powershell
# Install and run (first time)
.\setup.bat

# Run server (after setup)
.\run.bat
```

### Manual Setup

```powershell
# 1. Create virtual environment with Python 3.10
py -3.10 -m venv venv

# 2. Activate
venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Download models (first time only)
python download_models.py

# 5. Run server
python server.py
```

## Model Download

Models are downloaded from HuggingFace: `warmshao/FasterLivePortrait`

```powershell
python download_models.py
```

Models will be saved to `checkpoints/liveportrait_onnx/`

## API

### WebSocket `/ws`

**Send (Client -> Server):**
```json
{
  "type": "motion",
  "params": {
    "headRotation": [0.1, 0.2, 0.0],
    "eyeBlinkLeft": 0.0,
    "eyeBlinkRight": 0.0,
    "mouthOpen": 0.3,
    "smile": 0.5
  }
}
```

**Receive (Server -> Client):**
```json
{
  "type": "frame",
  "image": "data:image/jpeg;base64,..."
}
```

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Server status |
| POST | `/reference` | Upload reference image |

## Server URL

- WebSocket: `ws://localhost:8765/ws`
- HTTP: `http://localhost:8765`

## GPU Support (Optional)

For CUDA GPU acceleration:

```powershell
pip uninstall onnxruntime
pip install onnxruntime-gpu
```

Requires CUDA 11.x or 12.x installed.
