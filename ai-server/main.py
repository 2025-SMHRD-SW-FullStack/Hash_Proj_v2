from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.utils.database import Base, engine
from app.models.chatbot_message import ChatbotMessage  # noqa: F401
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from app.services.state import init_session, get_user_context, update_user_context
# 여기에서 edit_summary를 import해도, 위 __all__ 덕분에 항상 성공
from app.services.chatbot import reply_once, accept_now, edit_summary
from app.core.gpt_client import call_chatgpt  # ⬅️ AI 요약 엔드포인트용

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        ChatbotMessage.__table__.create(bind=engine, checkfirst=True)
        insp = inspect(engine)
        tables = insp.get_table_names()
        print(f"✅ DB URL: {engine.url}")
        if "chatbot_message" not in tables:
            raise RuntimeError("chatbot_message 테이블 미생성. DB/권한/스키마 확인 필요")
        print("✅ chatbot_message 테이블 생성(확인) 완료")
        yield
    except SQLAlchemyError as e:
        print(f"❌ lifespan DB 초기화 실패(SQLAlchemy): {e}")
        raise
    except Exception as e:
        print(f"❌ lifespan 초기화 실패: {e}")
        raise

app = FastAPI(title="Meonjeo Interview Chatbot", version="0.3.5", lifespan=lifespan)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

class CreateSession(BaseModel):
    user_id: int
    order_item_id: int
    product_id: int | None = None

class ReplyReq(BaseModel):
    user_id: int
    text: str

class AcceptReq(BaseModel):
    user_id: int

class EditReq(BaseModel):
    user_id: int
    instructions: str

def _strip_bearer(auth: str | None) -> str | None:
    if not auth:
        return None
    s = auth.strip()
    if s.lower().startswith("bearer "):
        s = s[7:].strip()
    return s or None

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/api/ai/chat/session")
def create_session(req: CreateSession, authorization: str | None = Header(default=None)):
    ok, first_question = init_session(
        user_id=req.user_id,
        order_item_id=req.order_item_id,
        product_id=req.product_id,
        bearer=authorization,
    )
    if not ok:
        raise HTTPException(status_code=400, detail=first_question or "피드백 작성이 불가합니다.")
    return {
        "session_id": str(req.user_id),
        "first_question": first_question,
        "step": (get_user_context(str(req.user_id)) or {}).get("stage"),
    }

@app.post("/api/ai/chat/reply")
def chat_reply(req: ReplyReq, authorization: str | None = Header(default=None)):
    tok = _strip_bearer(authorization)
    if tok:
        update_user_context(str(req.user_id), {"access_token": tok})
    return reply_once(user_id=str(req.user_id), user_text=req.text, bearer=authorization)

@app.post("/api/ai/chat/accept")
def accept(req: AcceptReq, authorization: str | None = Header(default=None)):
    tok = _strip_bearer(authorization)
    if tok:
        update_user_context(str(req.user_id), {"access_token": tok})
    ok, msg = accept_now(user_id=str(req.user_id), bearer=authorization)
    if not ok:
        raise HTTPException(status_code=400, detail=msg or "게시 실패")
    return {"ok": True, "message": msg}

@app.post("/api/ai/chat/edit")
def edit_summary_api(req: EditReq):
    return edit_summary(user_id=str(req.user_id), instructions=req.instructions)

# ======================
# ✅ 전날 데이터 AI 요약
# ======================

class DailyPayload(BaseModel):
    date: str
    productId: int
    productName: str | None = None
    category: str | None = None
    overallAvg: float | None = None
    stars: dict | None = None               # { "1": n, "2": n, ... }
    demographics: dict | None = None        # { "20대": n, ... }
    buyerSample: int | None = None
    byQuestionAvg: list | None = None       # [{questionId,label,average}]
    byQuestionChoice: list | None = None    # [{questionId,label,buckets}]
    feedbackTexts: list[str] | None = None  # 전날 텍스트 n개
    previousSummary: str | None = None      # 전전일 요약 전문

@app.post("/api/ai/summary/daily")
def ai_daily_summary(p: DailyPayload):
    """Spring이 보낸 전일 집계 JSON을 받아 LLM 요약을 생성"""
    system_prompt = """너는 전일 데이터를 바탕으로 전자상거래 셀러에게
핵심 인사이트를 간결하게 전달하는 분석가다.
출력은 JSON 한 줄 ONLY:
{"headline":"...", "keyPoints":["..."], "actions":["..."], "fullSummary":"...", "model":"gpt-4.1"}
- headline: 1줄(핵심 수치/경향)
- keyPoints: 3~5개 bullet (수치/변화/원인/경고)
- actions: 2~3개 실천 가이드
- fullSummary: Markdown(짧은 단락 2~4개)
수치/해석은 입력만 근거. 과장/추정 금지.
"""

    user_prompt = f"""
[일자] {p.date}
[상품] {p.productName or ''} / 카테고리={p.category or ''}
[구매자 표본] {p.buyerSample or 0}
[연령 분포] {p.demographics or {}}
[별점] 평균={p.overallAvg} / 분포={p.stars or {}}
[문항 평균] {p.byQuestionAvg or []}
[선택형 버킷] {p.byQuestionChoice or []}
[전날 요약] {p.previousSummary or '(없음)'}
[피드백 샘플 일부] {(p.feedbackTexts or [])[:10]}
"""

    try:
        txt = call_chatgpt(
            user_id=p.productId,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.3,
            max_tokens=800,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM 호출 실패: {e}")

    # JSON 안전 파싱 (비정상 응답 대비)
    import json
    try:
        obj = json.loads(txt)
    except Exception:
        obj = {
            "headline": (txt or "").strip()[:120],
            "keyPoints": [],
            "actions": [],
            "fullSummary": txt,
            "model": "gpt-4.1",
        }
    obj.setdefault("model", "gpt-4.1")
    return obj
