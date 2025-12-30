"""
@file server.py
@brief LivePortrait 추론 서버
@description FastAPI + WebSocket 기반 실시간 얼굴 애니메이션 추론 서버
"""

import asyncio
import base64
import io
import json
import logging
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np

from pipeline import LivePortraitPipeline

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI 앱
app = FastAPI(title="LivePortrait Inference Server")

# CORS 설정 (로컬 개발용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 전역 파이프라인 인스턴스
pipeline: Optional[LivePortraitPipeline] = None

# 연결된 클라이언트
connected_clients: set[WebSocket] = set()

# Reference 이미지
reference_image: Optional[np.ndarray] = None


@app.on_event("startup")
async def startup():
    """서버 시작 시 파이프라인 초기화"""
    global pipeline
    logger.info("Initializing LivePortrait pipeline...")
    try:
        pipeline = LivePortraitPipeline()
        await pipeline.load_models()
        logger.info("Pipeline initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize pipeline: {e}")
        # 파이프라인 없이 서버 시작 (테스트용)
        pipeline = None


@app.get("/status")
async def get_status():
    """서버 상태 확인"""
    return {
        "status": "running",
        "pipeline_ready": pipeline is not None and pipeline.is_ready,
        "reference_loaded": reference_image is not None,
        "connected_clients": len(connected_clients),
    }


@app.post("/reference")
async def upload_reference(file: UploadFile = File(...)):
    """Reference 이미지 업로드"""
    global reference_image
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        image = image.convert("RGB")
        
        # 256x256으로 리사이즈
        image = image.resize((256, 256), Image.Resampling.LANCZOS)
        reference_image = np.array(image)
        
        # 파이프라인에 reference 설정
        if pipeline and pipeline.is_ready:
            await pipeline.set_reference(reference_image)
        
        logger.info(f"Reference image uploaded: {file.filename}")
        return {"status": "success", "message": "Reference image uploaded"}
    
    except Exception as e:
        logger.error(f"Failed to upload reference: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 연결 핸들러"""
    await websocket.accept()
    connected_clients.add(websocket)
    logger.info(f"Client connected. Total: {len(connected_clients)}")
    
    try:
        while True:
            # 클라이언트로부터 메시지 수신
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "motion":
                # Motion 파라미터 처리
                params = message.get("params", {})
                
                # 추론 실행
                if pipeline and pipeline.is_ready and reference_image is not None:
                    try:
                        result_image = await pipeline.inference(params)
                        
                        # 이미지를 base64로 인코딩
                        pil_image = Image.fromarray(result_image)
                        buffer = io.BytesIO()
                        pil_image.save(buffer, format="JPEG", quality=85)
                        image_base64 = base64.b64encode(buffer.getvalue()).decode()
                        
                        # 결과 전송
                        await websocket.send_json({
                            "type": "frame",
                            "image": f"data:image/jpeg;base64,{image_base64}"
                        })
                    except Exception as e:
                        logger.error(f"Inference error: {e}")
                        await websocket.send_json({
                            "type": "error",
                            "message": str(e)
                        })
                else:
                    # 파이프라인 또는 reference 없음
                    await websocket.send_json({
                        "type": "status",
                        "message": "Pipeline not ready or reference not loaded"
                    })
            
            elif message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        connected_clients.discard(websocket)
        logger.info(f"Client removed. Total: {len(connected_clients)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
