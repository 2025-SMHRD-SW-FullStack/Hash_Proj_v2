import os, json, redis, logging
from typing import Dict, Any, List, Optional
from datetime import date

logger = logging.getLogger(__name__)

def _k_ctx(uid: str) -> str: return f"ctx:{uid}"
def _k_hist(uid: str) -> str: return f"hist:{uid}"

redis_client = None
try:
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        db=int(os.getenv("REDIS_DB", 0)),
        decode_responses=True,
    )
    redis_client.ping()
    logger.info("✅ Redis connected")
except Exception as e:
    logger.warning("⚠️ Redis not connected: %s", e)

# ---- DB 스냅샷/히스토리 폴백 유틸 ----
from sqlalchemy import select, desc
from app.utils.database import SessionLocal
from app.models.chatbot_context import ChatbotContext
from app.models.chatbot_message import ChatbotMessage

DEFAULT: Dict[str, Any] = {
    "stage": "qna",
    "user_id": None,
    "order_item_id": None, "orderItemId": None,
    "product_id": None, "productId": None,
    "category": "일반",
    "access_token": None,
    "item": None,            # 제품명
    "answers": [],           # [{q, a}]
    "last_q": None,          # 마지막 질문 텍스트
    "asked_slots": [],       # 이미 충분히 받은 슬롯 힌트들
    "summary": None,
    "reask_counts": {},
    "persona": None,         # {"gender":"F|M|U","ageRange":"20s|30s|U"}
}

def _load_ctx_from_db(uid: str) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        row = db.get(ChatbotContext, uid)
        if row and isinstance(row.ctx_json, dict):
            return row.ctx_json
        return DEFAULT.copy()
    finally:
        db.close()

def _save_ctx_to_db(uid: str, ctx: Dict[str, Any]) -> None:
    db = SessionLocal()
    try:
        row = db.get(ChatbotContext, uid)
        if row:
            row.ctx_json = ctx
        else:
            row = ChatbotContext(user_id=uid, ctx_json=ctx)
            db.add(row)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning("⚠️ save ctx to DB failed: %s", e)
    finally:
        db.close()

def get_user_context(uid: str) -> Dict[str, Any]:
    if redis_client:
        try:
            raw = redis_client.get(_k_ctx(uid))
            if raw:
                data = json.loads(raw)
                if isinstance(data, dict):
                    return data
            db_ctx = _load_ctx_from_db(uid)
            try:
                redis_client.set(_k_ctx(uid), json.dumps(db_ctx, ensure_ascii=False))
            except Exception:
                pass
            return db_ctx
        except Exception as e:
            logger.warning("⚠️ get ctx from Redis failed: %s", e)
            return _load_ctx_from_db(uid)
    return _load_ctx_from_db(uid)

def set_ctx(uid: str, ctx: Dict[str, Any]):
    if redis_client:
        try:
            redis_client.set(_k_ctx(uid), json.dumps(ctx, ensure_ascii=False))
        except Exception as e:
            logger.warning("⚠️ set ctx to Redis failed: %s", e)
    _save_ctx_to_db(uid, ctx)

def update_user_context(uid: str, updates: Dict[str, Any]):
    ctx = get_user_context(uid)
    if "orderItemId" in updates and "order_item_id" not in updates:
        updates["order_item_id"] = updates["orderItemId"]
    if "order_item_id" in updates and "orderItemId" not in updates:
        updates["orderItemId"] = updates["order_item_id"]
    if "productId" in updates and "product_id" not in updates:
        updates["product_id"] = updates["productId"]
    if "product_id" in updates and "productId" not in updates:
        updates["productId"] = updates["product_id"]
    ctx.update(updates)
    set_ctx(uid, ctx)

def add_chat_to_redis(uid: str, role: str, content: str, maxlen: int = 10):
    if not redis_client:
        return
    try:
        redis_client.lpush(_k_hist(uid), json.dumps({"role": role, "content": content}, ensure_ascii=False))
        redis_client.ltrim(_k_hist(uid), 0, maxlen - 1)
    except Exception as e:
        logger.warning("⚠️ push hist to Redis failed: %s", e)

def get_chat_history(uid: str) -> List[dict]:
    if redis_client:
        try:
            arr = redis_client.lrange(_k_hist(uid), 0, -1)
            if arr:
                return [json.loads(x) for x in reversed(arr)]
        except Exception as e:
            logger.warning("⚠️ get hist from Redis failed: %s", e)
    db = SessionLocal()
    try:
        N = 10
        q = select(ChatbotMessage)\
            .where(ChatbotMessage.user_id == uid)\
            .order_by(desc(ChatbotMessage.created_at))\
            .limit(N)
        rows = list(reversed(db.execute(q).scalars().all()))
        def _role_val(r):
            try: return r.role.value
            except Exception: return str(r.role)
        return [{"role": _role_val(r), "content": r.content} for r in rows]
    finally:
        db.close()

# ===== Spring 연동: 세션 초기화 =====
from app.utils.spring_api import (
    check_done_for_order_item,
    check_eligibility,
    get_product_meta,
    get_me,
)
from app.config.questions import normalize_category
from app.core.gpt_client import call_chatgpt

_FIRST_Q_PROMPT = """
당신은 후기 작성을 돕는 인터뷰어다.
제품 정보를 보고, 1문장 존댓말로 가장 먼저 물을 단 '한 가지 질문'만 고르라.
반환 JSON 한 줄: {"question":"..."}
"""

def _age_range_from_birth(birth_str: Optional[str]) -> str:
    try:
        if not birth_str: return "U"
        parts = [int(p) for p in str(birth_str).split("-") if p.isdigit()]
        if not parts: return "U"
        year = parts[0]
        today = date.today()
        age = today.year - year - ((today.month, today.day) < (parts[1] if len(parts)>1 else 1, parts[2] if len(parts)>2 else 1))
        decade = (age // 10) * 10
        if decade < 10 or decade > 80: return "U"
        return f"{decade}s"
    except Exception:
        return "U"

def _gen_first_question(item: str, category: str) -> str:
    meta = f"[제품명] {item or '알수없음'}\n[카테고리] {category or '일반'}"
    try:
        raw = call_chatgpt(
            user_id="system-first-q",
            system_prompt=_FIRST_Q_PROMPT,
            user_prompt=meta,
            chat_history=[],
            temperature=0.3
        )
        import json
        q = json.loads(str(raw)).get("question") or ""
        q = str(q).strip()
        if len(q) >= 5:
            return q
    except Exception:
        pass
    return "이 제품을 어떤 목적과 상황에서 주로 쓰셨는지 먼저 알려주실 수 있을까요?"

def init_session(user_id: int, order_item_id: int, product_id: int | None, bearer: str | None):
    uid = str(user_id)
    token = None
    if bearer:
        s = bearer.strip()
        if s.lower().startswith("bearer "): s = s[7:].strip()
        token = s or None

    logger.info("[session] init user=%s, orderItem=%s, product=%s", user_id, order_item_id, product_id)

    from app.utils.spring_api import check_done_for_order_item, check_eligibility, get_product_meta, get_me
    ok, reason = check_done_for_order_item(order_item_id=order_item_id, bearer_token=token)
    if ok is False:
        return False, reason or "이미 피드백을 작성하셨어요."
    ok2, reason2 = check_eligibility(order_item_id=order_item_id, bearer_token=token)
    if ok2 is False:
        return False, reason2 or "피드백 작성 조건을 충족하지 않습니다."

    meta = get_product_meta(product_id, bearer_token=token, fallback_order_item_id=order_item_id) if product_id else \
           get_product_meta(None, bearer_token=token, fallback_order_item_id=order_item_id)
    item = (meta.get("name") or "").strip()
    category = normalize_category(meta.get("category"))

    me = get_me(bearer_token=token) if token else {}
    gender = (me.get("gender") or "U").upper()[0] if isinstance(me.get("gender"), str) else "U"
    def _age_range_from_birth_local(birth_str):  # reuse
        return _age_range_from_birth(birth_str)
    age_range = _age_range_from_birth_local(me.get("birthDate") or me.get("birth_date") or None)
    persona = {"gender": gender if gender in ("F", "M") else "U", "ageRange": age_range}

    first_q = _gen_first_question(item, category)

    ctx = DEFAULT.copy()
    ctx.update({
        "stage": "qna",
        "user_id": user_id,
        "order_item_id": order_item_id, "orderItemId": order_item_id,
        "product_id": product_id, "productId": product_id,
        "category": category,
        "item": item,
        "answers": [],
        "last_q": first_q,
        "asked_slots": [],
        "summary": None,
        "access_token": token,
        "reask_counts": {},
        "persona": persona,
    })
    set_ctx(uid, ctx)
    logger.info("[session] context initialized: item=%s, category=%s, first_q=%s", item, category, first_q)

    first = (
        f"안녕하세요! 😊 '{item or '해당 상품'}' 사용 경험을 몇 가지 여쭤볼게요.\n\n"
        f"Q1) {first_q}"
    )
    return True, first
