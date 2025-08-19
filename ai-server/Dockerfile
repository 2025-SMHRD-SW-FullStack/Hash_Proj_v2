# Optimized Dockerfile with model precache & cache dir
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TRANSFORMERS_CACHE=/opt/hf_cache \
    HF_HOME=/opt/hf_cache

# Build-time switches (0/1) for precache
ARG PRECACHE_CLIP=1
ARG PRECACHE_BLIP=1

# OS deps: Tesseract (Korean), curl, certs
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-kor \
    curl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Cache directory for models
RUN mkdir -p /opt/hf_cache && chmod -R 777 /opt/hf_cache

WORKDIR /app

# Install python deps first for better layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# (Optional) Pre-cache CLIP model at build-time to avoid first-request latency
RUN if [ "$PRECACHE_CLIP" = "1" ]; then \
  python - <<'PY'
import open_clip
open_clip.create_model_and_transforms("ViT-B-32", pretrained="laion2b_s34b_b79k")
print("[Docker] CLIP cached")
PY
; fi

# (Optional) Pre-cache BLIP (image caption) at build-time
RUN if [ "$PRECACHE_BLIP" = "1" ]; then \
  python - <<'PY'
from transformers import pipeline
from PIL import Image
pipe = pipeline("image-to-text", model="Salesforce/blip-image-captioning-base")
img = Image.new("RGB", (1,1))
_ = pipe(img, max_new_tokens=1)
print("[Docker] BLIP cached")
PY
; fi

# App source
COPY . .

# Runtime env (can be overridden by .env or compose)
ENV OCR_LANG=kor+eng \
    IMG_ANALYSIS_MAX=3 \
    IMG_ANALYSIS_MODE=auto \
    IMG_ANALYSIS_CLIP=1 \
    IMG_ANALYSIS_BLIP=1

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
