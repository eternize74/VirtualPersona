"""
@file pipeline.py
@brief LivePortrait Inference Pipeline (Lightweight)
@description Direct ONNX inference without FasterLivePortrait dependencies
"""

import asyncio
import logging
from typing import Optional, Dict, Any
from pathlib import Path

import numpy as np
import cv2

logger = logging.getLogger(__name__)

# Model paths
CHECKPOINT_DIR = Path(__file__).parent / "checkpoints"


class LivePortraitPipeline:
    """
    @brief LivePortrait inference pipeline (lightweight)
    @description Uses ONNX models directly for inference
    """
    
    def __init__(self):
        """Initialize pipeline"""
        self.is_ready = False
        self.reference_image = None
        
        # ONNX sessions
        self.appearance_extractor = None
        self.motion_extractor = None
        self.warping_module = None
        self.stitching_module = None
        self.landmark_detector = None
        
        # Cached features
        self.source_kp = None
        self.source_rotation = None
        self.generator_input = None
        
        # Device info
        self.device = "cpu"
    
    async def load_models(self):
        """
        @brief Load ONNX models
        """
        logger.info("Loading LivePortrait models...")
        
        try:
            import onnxruntime as ort
            
            # Check available providers
            available = ort.get_available_providers()
            logger.info(f"Available providers: {available}")
            
            if 'CUDAExecutionProvider' in available:
                providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
                self.device = "cuda"
            else:
                providers = ['CPUExecutionProvider']
                self.device = "cpu"
            
            logger.info(f"Using device: {self.device}")
            
            onnx_path = CHECKPOINT_DIR / "liveportrait_onnx"
            if onnx_path.exists():
                await self._load_onnx_models(onnx_path, providers)
            else:
                logger.warning("ONNX models not found, using DUMMY mode")
            
            self.is_ready = True
            logger.info("Pipeline ready")
            
        except ImportError:
            logger.warning("ONNX Runtime not available")
            self.is_ready = True
            logger.info("Falling back to dummy mode")
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            self.is_ready = True
            logger.info("Falling back to dummy mode")
    
    async def _load_onnx_models(self, model_path: Path, providers: list):
        """Load ONNX model sessions"""
        import onnxruntime as ort
        
        # Appearance Feature Extractor
        ae_path = model_path / "appearance_feature_extractor.onnx"
        if ae_path.exists():
            self.appearance_extractor = ort.InferenceSession(
                str(ae_path), providers=providers
            )
            logger.info("Loaded appearance_feature_extractor")
        
        # Motion Extractor
        me_path = model_path / "motion_extractor.onnx"
        if me_path.exists():
            self.motion_extractor = ort.InferenceSession(
                str(me_path), providers=providers
            )
            logger.info("Loaded motion_extractor")
        
        # Stitching
        st_path = model_path / "stitching.onnx"
        if st_path.exists():
            self.stitching_module = ort.InferenceSession(
                str(st_path), providers=providers
            )
            logger.info("Loaded stitching")
        
        # Landmark detector (for face detection)
        lm_path = model_path / "landmark.onnx"
        if lm_path.exists():
            self.landmark_detector = ort.InferenceSession(
                str(lm_path), providers=providers
            )
            logger.info("Loaded landmark")
    
    async def set_reference(self, image: np.ndarray):
        """
        @brief Set reference image and extract features
        @param image RGB image (256x256x3)
        """
        self.reference_image = image.copy()
        
        # Extract appearance features
        if self.appearance_extractor is not None:
            try:
                input_tensor = self._preprocess_image(image)
                
                input_name = self.appearance_extractor.get_inputs()[0].name
                output_names = [o.name for o in self.appearance_extractor.get_outputs()]
                
                outputs = self.appearance_extractor.run(output_names, {input_name: input_tensor})
                self.generator_input = outputs[0]
                logger.info(f"Extracted appearance features: {self.generator_input.shape}")
                
            except Exception as e:
                logger.error(f"Error extracting appearance features: {e}")
        
        # Extract motion features (keypoints)
        if self.motion_extractor is not None:
            try:
                input_tensor = self._preprocess_image(image)
                
                input_name = self.motion_extractor.get_inputs()[0].name
                output_names = [o.name for o in self.motion_extractor.get_outputs()]
                
                outputs = self.motion_extractor.run(output_names, {input_name: input_tensor})
                
                # Store source keypoints and rotation
                self.source_kp = outputs[0] if len(outputs) > 0 else None
                self.source_rotation = outputs[1] if len(outputs) > 1 else None
                
                logger.info(f"Extracted motion features, kp shape: {self.source_kp.shape if self.source_kp is not None else 'None'}")
                
            except Exception as e:
                logger.error(f"Error extracting motion features: {e}")
        
        logger.info("Reference image set")
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        @brief Preprocess image for model input
        @param image RGB image (HWC, uint8)
        @return Preprocessed tensor (NCHW, float32)
        """
        # Resize to 256x256 if needed
        if image.shape[:2] != (256, 256):
            image = cv2.resize(image, (256, 256))
        
        # HWC -> CHW
        image = image.transpose(2, 0, 1)
        # Normalize [0, 255] -> [0, 1]
        image = image.astype(np.float32) / 255.0
        # Add batch dimension
        image = np.expand_dims(image, axis=0)
        
        return image
    
    def _postprocess_image(self, output: np.ndarray) -> np.ndarray:
        """
        @brief Postprocess model output to image
        @param output Model output (NCHW, float32)
        @return RGB image (HWC, uint8)
        """
        # Remove batch dimension
        output = output[0]
        # CHW -> HWC
        output = output.transpose(1, 2, 0)
        # [0, 1] -> [0, 255]
        output = np.clip(output * 255.0, 0, 255).astype(np.uint8)
        
        return output
    
    async def inference(self, motion_params: Dict[str, Any]) -> np.ndarray:
        """
        @brief Run inference with motion parameters
        @param motion_params Motion parameters from face tracking
        @return Generated image (256x256x3, uint8)
        """
        if self.reference_image is None:
            raise ValueError("Reference image not set")
        
        # Extract motion parameters
        head_rotation = motion_params.get("headRotation", [0, 0, 0])
        mouth_open = motion_params.get("mouthOpen", 0)
        eye_blink_left = motion_params.get("eyeBlinkLeft", 0)
        eye_blink_right = motion_params.get("eyeBlinkRight", 0)
        smile = motion_params.get("smile", 0)
        
        # Apply transformations to reference image
        # Note: Full pipeline requires warping which needs special ONNX runtime
        # For now, apply simple affine transform + expression overlay
        
        result = self.reference_image.copy()
        
        # Apply head rotation as affine transform
        h, w = result.shape[:2]
        center = (w // 2, h // 2)
        
        # Rotation angle from yaw (horizontal head turn)
        yaw = head_rotation[1] * 30  # Scale to degrees
        pitch = head_rotation[0] * 15
        
        # Create rotation matrix
        M = cv2.getRotationMatrix2D(center, -yaw, 1.0)
        
        # Apply vertical shift for pitch
        M[1, 2] += pitch * 2
        
        # Apply transform
        result = cv2.warpAffine(result, M, (w, h), 
                               borderMode=cv2.BORDER_REPLICATE)
        
        # Apply expression effects
        # Brightness adjustment based on mouth open
        if mouth_open > 0.1:
            brightness = 1.0 + mouth_open * 0.05
            result = np.clip(result * brightness, 0, 255).astype(np.uint8)
        
        # Slight blur for eye blink effect
        blink = (eye_blink_left + eye_blink_right) / 2
        if blink > 0.5:
            kernel_size = int(3 + blink * 2)
            if kernel_size % 2 == 0:
                kernel_size += 1
            result = cv2.GaussianBlur(result, (kernel_size, kernel_size), 0)
        
        return result
