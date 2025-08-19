from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.review_api import router as review_router
from app.utils.database import engine
from app.store.db_models import Base
from app.main_warmup import register_startup_warmup

app = FastAPI(title="AI Server (MySQL)", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(review_router, prefix="/ai")

@app.on_event("startup")
def on_startup():
    # ★ 모델(엔티티) 기준으로 테이블 자동 생성
    Base.metadata.create_all(bind=engine())

@app.get("/health")
def health():
    return {"status": "ok"}

register_startup_warmup(app)