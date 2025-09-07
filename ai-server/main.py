from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.utils.database import Base, engine
from app.models.chatbot_message import ChatbotMessage  # noqa: F401
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from app.services.state import init_session, get_user_context, update_user_context
from app.services.chatbot import reply_once, accept_now, edit_summary
from app.core.gpt_client import call_chatgpt

import json
import concurrent.futures
from typing import Any, Dict, Optional, List

LLM_TIMEOUT_SEC = 20

def _call_llm_with_timeout(product_id: int, system_prompt: str, user_prompt: str, *, timeout_sec: int = LLM_TIMEOUT_SEC) -> str:
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
    return {
        "headline": headline,
        "keyPoints": keyPoints,
        "actions": actions,
        "fullSummary": fullSummary,
        "model": "fallback",
    }

def _fallback_from_realtime(p) -> Dict[str, Any]:
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
    return {
        "headline": headline,
        "keyPoints": keyPoints,
        "actions": actions,
        "fullSummary": fullSummary,
        "model": "fallback",
    }

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

app = FastAPI(title="Meonjeo Interview Chatbot", version="0.3.8", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# === 요청 모델 ===
class CreateSession(BaseModel):
    user_id: int
    order_item_id: int
    product_id: Optional[int] = None
    overall_score: Optional[int] = None
    survey_answers: Optional[Dict[str, Any]] = None

class ReplyReq(BaseModel):
    user_id: int
    text: str

class AcceptReq(BaseModel):
    user_id: int
    images: Optional[List[str]] = None
    survey_answers: Optional[Dict[str, Any]] = None
    overall_score: Optional[int] = None

class EditReq(BaseModel):
    user_id: int
    instructions: str

def _strip_bearer(auth: Optional[str]) -> Optional[str]:
    if not auth:
        return None
    s = auth.strip()
    if s.lower().startswith("bearer "):
        s = s[7:].strip()
    return s or None

# === 라우팅 ===
@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/api/ai/chat/session")
def create_session(req: CreateSession, authorization: Optional[str] = Header(default=None)):
    ok, first_question = init_session(
        user_id=req.user_id,
        order_item_id=req.order_item_id,
        product_id=req.product_id,
        bearer=authorization,
    )
    if not ok:
        raise HTTPException(status_code=400, detail=first_question or "피드백 작성이 불가합니다.")

    updates: Dict[str, Any] = {}
    if req.overall_score is not None:
        updates["overallScore"] = int(req.overall_score)
    if req.survey_answers is not None:
        updates["preSurveyAnswers"] = req.survey_answers
    if updates:
        update_user_context(str(req.user_id), updates)

    return {
        "session_id": str(req.user_id),
        "first_question": first_question,
        "step": (get_user_context(str(req.user_id)) or {}).get("stage"),
    }

@app.post("/api/ai/chat/reply")
def chat_reply(req: ReplyReq, authorization: Optional[str] = Header(default=None)):
    tok = _strip_bearer(authorization)
    if tok:
        update_user_context(str(req.user_id), {"access_token": tok})
    return reply_once(user_id=str(req.user_id), user_text=req.text, bearer=authorization)

@app.post("/api/ai/chat/accept")
def accept(req: AcceptReq, authorization: Optional[str] = Header(default=None)):
    tok = _strip_bearer(authorization)
    if tok:
        update_user_context(str(req.user_id), {"access_token": tok})

    add = {}
    if req.survey_answers is not None:
        add["preSurveyAnswers"] = req.survey_answers
    if req.overall_score is not None:
        add["overallScore"] = int(req.overall_score)
    if add:
        update_user_context(str(req.user_id), add)

    ok, info = accept_now(user_id=str(req.user_id), bearer=authorization, images=req.images)
    if not ok:
        msg = info.get("message") if isinstance(info, dict) else (info or "게시 실패")
        raise HTTPException(status_code=400, detail=msg)

    # 평탄화 반환(awardedPoint/feedbackId 포함)
    if isinstance(info, dict):
        return {"ok": True, **info}
    else:
        return {"ok": True, "message": str(info), "awardedPoint": 0}

@app.post("/api/ai/chat/edit")
def edit_summary_api(req: EditReq):
    return edit_summary(user_id=str(req.user_id), instructions=req.instructions)

# === 요약 API (기존) ===
class DailyPayload(BaseModel):
    date: str
    productId: int
    productName: Optional[str] = None
    category: Optional[str] = None
    overallAvg: Optional[float] = None
    stars: Optional[dict] = None
    demographics: Optional[dict] = None
    buyerSample: Optional[int] = None
    byQuestionAvg: Optional[list] = None
    byQuestionChoice: Optional[list] = None
    feedbackTexts: Optional[List[str]] = None
    previousSummary: Optional[str] = None

@app.post("/api/ai/summary/daily")
def ai_daily_summary(p: DailyPayload):
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
        txt = _call_llm_with_timeout(p.productId, system_prompt, user_prompt, timeout_sec=LLM_TIMEOUT_SEC)
        obj = _as_json_or_wrap(txt)
        obj.setdefault("model", "gpt-4.1")
        return obj
    except Exception:
        # 간단한 폴백
        avg = p.overallAvg or 0
        buyer = int(p.buyerSample or 0)
        headline = f"{p.date} 평균 {avg:.1f}점 · 표본 {buyer}건"
        return {"headline": headline, "keyPoints": [], "actions": [], "fullSummary": headline, "model": "fallback"}

class RealtimePayload(BaseModel):
    productId: int
    productName: Optional[str] = None
    category: Optional[str] = None
    buyerSample: Optional[int] = None
    stars: Optional[dict] = None
    demographics: Optional[dict] = None
    byQuestionAvg: Optional[list] = None
    byQuestionChoice: Optional[list] = None
    feedbackTexts: Optional[List[str]] = None
    period: Optional[str] = "TODAY"

@app.post("/api/ai/summary/realtime")
def ai_realtime_summary(p: RealtimePayload):
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
        txt = _call_llm_with_timeout(p.productId, system_prompt, user_prompt, timeout_sec=LLM_TIMEOUT_SEC)
        obj = _as_json_or_wrap(txt)
        obj.setdefault("model", "gpt-4.1")
        return obj
    except Exception:
        buyer = int((p.buyerSample or 0))
        headline = f"금일 스냅샷: 표본 {buyer}건"
        return {"headline": headline, "keyPoints": [], "actions": [], "fullSummary": headline, "model": "fallback"}
