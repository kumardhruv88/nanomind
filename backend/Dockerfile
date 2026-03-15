FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY main.py .
COPY download_model.py .

# Create models directory
RUN mkdir -p models

# HuggingFace Spaces runs on port 7860
EXPOSE 7860

# Startup: download model then start server
CMD ["sh", "-c", "python download_model.py && uvicorn main:app --host 0.0.0.0 --port 7860"]
