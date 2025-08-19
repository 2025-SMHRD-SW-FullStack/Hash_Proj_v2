import os
from fastapi import FastAPI

# 서버 기동 시 CLIP/BLIP 모델을 미리 초기화(첫 요청 지연 방지)
def register_startup_warmup(app: FastAPI):
    @app.on_event("startup")
    def _warmup():
        try:
            from app.services.image_analysis_service import ImageAnalysisService
            svc = ImageAnalysisService()

            if os.getenv("IMG_ANALYSIS_CLIP", "0") == "1":
                try:
                    svc._setup_clip()
                    print("[startup] CLIP initialized")
                except Exception as e:
                    print(f"[startup] CLIP init failed: {e}")

            if os.getenv("IMG_ANALYSIS_BLIP", "0") == "1":
                try:
                    svc._setup_blip()
                    print("[startup] BLIP initialized")
                except Exception as e:
                    print(f"[startup] BLIP init failed: {e}")

        except Exception as e:
            print(f"[startup] warmup skipped: {e}")
