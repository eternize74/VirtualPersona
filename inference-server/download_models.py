"""
@file download_models.py
@brief LivePortrait ONNX models downloader
@description Downloads models from HuggingFace
"""

import os
from pathlib import Path

def main():
    print("=" * 50)
    print("  LivePortrait Model Downloader")
    print("=" * 50)
    print()
    
    checkpoint_dir = Path(__file__).parent / "checkpoints"
    
    try:
        from huggingface_hub import snapshot_download
        
        print("[INFO] Downloading models from HuggingFace...")
        print("[INFO] This may take a few minutes...")
        print()
        
        snapshot_download(
            repo_id="warmshao/FasterLivePortrait",
            local_dir=str(checkpoint_dir),
            ignore_patterns=["*.md", "*.txt", "*.git*"]
        )
        
        print()
        print("[OK] Models downloaded successfully!")
        print(f"[INFO] Location: {checkpoint_dir}")
        
    except ImportError:
        print("[INFO] Installing huggingface_hub...")
        os.system("pip install huggingface_hub")
        
        print("[INFO] Please run this script again.")
        return
    
    except Exception as e:
        print(f"[ERROR] Download failed: {e}")
        print()
        print("Manual download:")
        print("1. Visit: https://huggingface.co/warmshao/FasterLivePortrait")
        print(f"2. Download and extract to: {checkpoint_dir}")
        return


if __name__ == "__main__":
    main()