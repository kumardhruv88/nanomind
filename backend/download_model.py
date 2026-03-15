"""
download_model.py
Runs at container startup — downloads model weights from HuggingFace Hub.

Steps to set this up:
1. Upload your .pt files to HuggingFace Hub (run upload_to_hf.py locally first)
2. Set HF_REPO_ID env variable in your Space settings
3. This script runs automatically before uvicorn starts
"""

import os
import sys

HF_REPO_ID   = os.environ.get("HF_REPO_ID", "")        # e.g. "dhruvkumar88/dhruvgpt-30m"
HF_TOKEN     = os.environ.get("HF_TOKEN", "")           # optional, for private repos
MODELS_DIR   = "models"
MODEL_FILES  = ["sft_model.pt", "best_model.pt"]

def download():
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Skip if models already exist (container restart)
    existing = [f for f in MODEL_FILES if os.path.exists(f"{MODELS_DIR}/{f}")]
    if existing:
        print(f"✅ Models already present: {existing}")
        return

    if not HF_REPO_ID:
        print("⚠️  HF_REPO_ID not set. Skipping model download.")
        print("   Set HF_REPO_ID in Space environment variables.")
        print("   API will run in demo mode without a real model.")
        return

    try:
        from huggingface_hub import hf_hub_download
        print(f"📥 Downloading models from {HF_REPO_ID}...")

        for fname in MODEL_FILES:
            dest = f"{MODELS_DIR}/{fname}"
            if os.path.exists(dest):
                print(f"   ⏭  {fname} already exists, skipping")
                continue
            try:
                path = hf_hub_download(
                    repo_id=HF_REPO_ID,
                    filename=fname,
                    token=HF_TOKEN or None,
                    local_dir=MODELS_DIR,
                )
                size = os.path.getsize(dest) / 1e6
                print(f"   ✅ {fname} downloaded ({size:.0f} MB)")
            except Exception as e:
                print(f"   ⚠️  Could not download {fname}: {e}")

        print("✅ Model download complete!")

    except ImportError:
        print("❌ huggingface_hub not installed. Add it to requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Download failed: {e}")
        # Don't exit — let API start in demo mode
        print("   Starting API in demo mode...")

if __name__ == "__main__":
    download()
