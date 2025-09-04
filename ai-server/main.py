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
from app.core.gpt_client import call_chatgpt  # ⬅️ LLM 호출

# ===== 추가: timeout + 폴백 유틸 =====
import json
import concurrent.futures
from typing import Any, Dict

LLM_TIMEOUT_SEC = 20  # LLM 최대 대기 시간(초)

def _call_llm_with_timeout(product_id: int, system_prompt: str, user_prompt: str, *, timeout_sec: int = LLM_TIMEOUT_SEC) -> str:
    """call_chatgpt를 별도 스레드에서 실행해 timeout_sec 내 결과만 받음."""
    def _run():
        return call_chatgpt(
            user_id=product_id,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.3,
            max_tokens=800,
        )
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        fut = ex.submit(_run)
        try:
            return fut.result(timeout=timeout_sec)
        except concurrent.futures.TimeoutError:
            raise TimeoutError(f"LLM timeout>{timeout_sec}s")

def _as_json_or_wrap(txt: str) -> Dict[str, Any]:
    """LLM이 JSON이 아니어도 안전하게 JSON으로 감쌈."""
    try:
        obj = json.loads((txt or "").strip())
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass
    return {
        "headline": (txt or "").strip()[:120] or "요약 생성 실패 – 입력 통계로 임시 요약",
        "keyPoints": [],
        "actions": [],
        "fullSummary": txt or "",
        "model": "fallback",
    }

def _fallback_from_daily(p) -> Dict[str, Any]:
    """LLM 없이 숫자 지표로 빠르게 요약 생성(전일/누적용)."""
    avg = p.overallAvg or 0
    stars = p.stars or {}
    try:
        total = int(p.buyerSample or sum(int(stars.get(k, 0)) for k in stars))
    except Exception:
        total = int(p.buyerSample or 0)

    demo = p.demographics or {}
    top_age = None
    if isinstance(demo, dict) and demo:
        try:
            top_age = max(demo.items(), key=lambda x: (x[1] or 0))[0]
        except Exception:
            top_age = None

    def _ratio(key):
        try:
            v = int(stars.get(str(key), 0) or stars.get(int(key), 0) or 0)
        except Exception:
            v = 0
        return (v / total * 100) if total else 0.0

    r5 = round(_ratio(5))
    r1 = round(_ratio(1))

    headline = f"{p.date} 평균 {avg:.1f}점 · 표본 {total}건" + (f" · 주 구매층 {top_age}" if top_age else "")
    keyPoints = []
    if total:
        keyPoints.append(f"5점 비중 {r5}% / 1점 {r1}%")
    if p.byQuestionAvg:
        try:
            hi = max(p.byQuestionAvg, key=lambda q: float(q.get('average') or 0))
            lo = min(p.byQuestionAvg, key=lambda q: float(q.get('average') or 0))
            keyPoints.append(f"가장 높은 문항: {hi.get('label','')} {float(hi.get('average') or 0):.1f}")
            keyPoints.append(f"가장 낮은 문항: {lo.get('label','')} {float(lo.get('average') or 0):.1f}")
        except Exception:
            pass

    actions = []
    if avg and avg < 3.5:
        actions.append("저평점(★1~2) 리뷰 우선 응대 및 원인 분류")
    actions.append("상·하위 문항별 개선 액션 정의 및 공지")

    fullSummary = (
        f"- 전일 기준 평균 별점 {avg:.1f}점, 표본 {total}건입니다.\n"
        + (f"- 주요 구매층은 {top_age}입니다.\n" if top_age else "")
        + (f"- 5점 비중 {r5}%, 1점 비중 {r1}%로 파악됩니다.\n" if total else "")
        + "- 상위/하위 문항을 중심으로 개선 액션을 수립하세요."
    )
    return {"headline": headline, "keyPoints": keyPoints, "actions": actions, "fullSummary": fullSummary, "model": "fallback"}

def _fallback_from_realtime(p) -> Dict[str, Any]:
    """LLM 없이 숫자 지표로 빠르게 요약 생성(실시간 스냅샷용)."""
    stars = p.stars or {}
    avg = stars.get("avg")
    if avg is None:
        try:
            total = sum(int(stars.get(str(k), 0) or 0) for k in [1, 2, 3, 4, 5])
            avg = (sum(int(stars.get(str(k), 0) or 0) * k for k in [1, 2, 3, 4, 5]) / total) if total else 0
        except Exception:
            avg = 0
    buyer = int(p.buyerSample or 0)
    headline = f"금일 스냅샷: 평균 {float(avg or 0):.1f}점 · 구매 {buyer}건"
    keyPoints = []
    if buyer == 0:
        keyPoints.append("금일 구매 표본이 아직 부족합니다.")
    actions = ["저평점 리뷰 실시간 모니터링", "응대 템플릿으로 빠른 회신"]
    fullSummary = "- 금일 데이터 기준 간단 요약입니다. 표본이 늘어나면 자동 보강됩니다."
    return {"headline": headline, "keyPoints": keyPoints, "actions": actions, "fullSummary": fullSummary, "model": "fallback"}

# ===== 기본 앱 구성 =====
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

app = FastAPI(title="Meonjeo Interview Chatbot", version="0.3.6", lifespan=lifespan)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
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
    """전일 집계 JSON을 받아 LLM 요약을 생성. 타임아웃 시 즉시 폴백."""
    system_prompt = """너는 전일 데이터를 바탕으로 전자상거래 셀러에게
핵심 인사이트를 간결하게 전달하는 분석가다.
출력은 JSON 한 줄 ONLY:
{"headline":"...", "keyPoints":["..."], "actions":["..."], "fullSummary":"...", "model":"gpt-4.1"}"""
    user_prompt = f"""
[일자] {p.date}
[상품] {p.productName or ''} / 카테고리={p.category or ''}
[구매자 표본] {p.buyerSample or 0}
[연령 분포] {p.demographics or {}}
[별점] 평균={p.overallAvg} / 분포={p.stars or {}}
[문항 평균] {p.byQuestionAvg or []}
[선택형 버킷] {p.byQuestionChoice or []}
[전날 요약] {p.previousSummary or '(없음)'}
[피드백 샘플 일부] {(p.feedbackTexts or [])[:8]}
""".strip()

    try:
        txt = _call_llm_with_timeout(
            product_id=p.productId,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            timeout_sec=LLM_TIMEOUT_SEC,
        )
        obj = _as_json_or_wrap(txt)
        obj.setdefault("model", "gpt-4.1")
        return obj
    except Exception:
        # LLM 타임아웃/오류 → 즉시 폴백 반환
        return _fallback_from_daily(p)

# ======================
# ✅ 실시간 스냅샷 AI 요약 (금일/최근)
# ======================
class RealtimePayload(BaseModel):
    productId: int
    productName: str | None = None
    category: str | None = None
    buyerSample: int | None = None           # 금일 구매건수
    stars: dict | None = None                # {"1":n, ... , "avg": 4.3}
    demographics: dict | None = None         # {"20대":n, ...} (선택)
    byQuestionAvg: list | None = None        # [{label, average}]
    byQuestionChoice: list | None = None     # [{label, slices:[{label, ratio}]}]
    feedbackTexts: list[str] | None = None   # 최신 텍스트 N개(선택)
    period: str | None = "TODAY"             # 표시용

@app.post("/api/ai/summary/realtime")
def ai_realtime_summary(p: RealtimePayload):
    """실시간 스냅샷 JSON을 받아 LLM 요약을 생성. 타임아웃 시 즉시 폴백."""
    system_prompt = """너는 '금일/최근' 실시간 데이터를 바탕으로
전자상거래 셀러에게 핵심 인사이트를 간결하게 전달하는 분석가다.
출력은 JSON 한 줄 ONLY:
{"headline":"...", "keyPoints":["..."], "actions":["..."], "fullSummary":"...", "model":"gpt-4.1"}"""
    user_prompt = f"""
[기간] {p.period or 'TODAY'}
[상품] {p.productName or ''} / 카테고리={p.category or ''}
[금일 구매건수] {p.buyerSample or 0}
[별점] 평균={(p.stars or {}).get('avg')} / 분포={p.stars or {}}
[문항 평균] {p.byQuestionAvg or []}
[선택형 버킷] {p.byQuestionChoice or []}
[인구 분포] {p.demographics or {}}
[최근 텍스트 샘플] {(p.feedbackTexts or [])[:8]}
""".strip()

    try:
        txt = _call_llm_with_timeout(
            product_id=p.productId,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            timeout_sec=LLM_TIMEOUT_SEC,
        )
        obj = _as_json_or_wrap(txt)
        obj.setdefault("model", "gpt-4.1")
        return obj
    except Exception:
        return _fallback_from_realtime(p)
