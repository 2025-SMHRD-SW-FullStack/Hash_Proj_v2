import os, json, redis, logging
from typing import Dict, Any, List, Optional
from datetime import date, datetime

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

DEFAULT: Dict[str, Any] = {
    "stage": "start",
    "user_id": None,
    "order_item_id": None, "orderItemId": None,
    "product_id": None, "productId": None,
    "category": "일반",
    "access_token": None,
    "item": None,               # 제품명
    "answers": [],              # [{q, a}]
    "q_flow": [],               # 질문 플로우
    "q_idx": 0,
    "summary": None,
    "reask_counts": {},         # {"0": 1, ...} 각 질문 재질문 횟수
    "persona": None,            # {"gender": "F|M|U", "ageRange": "20s|30s|U"}
}

def get_user_context(uid: str) -> Dict[str, Any]:
    if not redis_client:
        return DEFAULT.copy()
    raw = redis_client.get(_k_ctx(uid))
    if not raw:
        redis_client.set(_k_ctx(uid), json.dumps(DEFAULT, ensure_ascii=False))
        return DEFAULT.copy()
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else DEFAULT.copy()
    except Exception:
        return DEFAULT.copy()

def set_ctx(uid: str, ctx: Dict[str, Any]):
    if not redis_client: return
    redis_client.set(_k_ctx(uid), json.dumps(ctx, ensure_ascii=False))

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
    if not redis_client: return
    redis_client.lpush(_k_hist(uid), json.dumps({"role": role, "content": content}, ensure_ascii=False))
    redis_client.ltrim(_k_hist(uid), 0, maxlen - 1)

def get_chat_history(uid: str) -> List[dict]:
    if not redis_client:
        return []
    arr = redis_client.lrange(_k_hist(uid), 0, -1)
    return [json.loads(x) for x in reversed(arr)]

# ===== Spring 연동: 세션 초기화 =====
from app.utils.spring_api import (
    check_done_for_order_item,
    check_eligibility,
    get_product_meta,
    get_me,   # ← 추가
)
from app.config.questions import build_question_flow, normalize_category

def _age_range_from_birth(birth_str: Optional[str]) -> str:
    try:
        if not birth_str:
            return "U"
        # 'YYYY-MM-DD' 또는 'YYYY-MM' 등 유연 처리
        parts = [int(p) for p in str(birth_str).split("-") if p.isdigit()]
        if not parts:
            return "U"
        year = parts[0]
        today = date.today()
        age = today.year - year - ( (today.month, today.day) < (parts[1] if len(parts)>1 else 1, parts[2] if len(parts)>2 else 1) )
        decade = (age // 10) * 10
        if decade < 10 or decade > 80:
            return "U"
        return f"{decade}s"
    except Exception:
        return "U"

def init_session(user_id: int, order_item_id: int, product_id: int | None, bearer: str | None):
    uid = str(user_id)
    token = None
    if bearer:
        s = bearer.strip()
        if s.lower().startswith("bearer "):
            s = s[7:].strip()
        token = s or None

    logger.info("[session] init user=%s, orderItem=%s, product=%s", user_id, order_item_id, product_id)

    ok, reason = check_done_for_order_item(order_item_id=order_item_id, bearer_token=token)
    if ok is False:
        return False, reason or "이미 피드백을 작성하셨어요."

    ok2, reason2 = check_eligibility(order_item_id=order_item_id, bearer_token=token)
    if ok2 is False:
        return False, reason2 or "피드백 작성 조건을 충족하지 않습니다."

    # 상품 메타 조회(이름/카테고리)
    meta = get_product_meta(product_id, bearer_token=token, fallback_order_item_id=order_item_id) if product_id else \
           get_product_meta(None, bearer_token=token, fallback_order_item_id=order_item_id)
    item = (meta.get("name") or "").strip()
    category = normalize_category(meta.get("category"))

    # 유저 퍼소나
    me = get_me(bearer_token=token) if token else {}
    gender = (me.get("gender") or "U").upper()[0] if isinstance(me.get("gender"), str) else "U"
    age_range = _age_range_from_birth(me.get("birthDate") or me.get("birth_date") or None)
    persona = {"gender": gender if gender in ("F", "M") else "U", "ageRange": age_range}

    # 질문 플로우 구성
    q_flow = build_question_flow(category)
    first_q = q_flow[0] if q_flow else "가장 인상 깊었던 점을 알려주세요."

    ctx = DEFAULT.copy()
    ctx.update({
        "stage": "qna",  # 바로 Q&A
        "user_id": user_id,
        "order_item_id": order_item_id, "orderItemId": order_item_id,
        "product_id": product_id, "productId": product_id,
        "category": category,
        "item": item,
        "answers": [],
        "q_flow": q_flow,
        "q_idx": 0,
        "summary": None,
        "access_token": token,
        "reask_counts": {},
        "persona": persona,
    })
    set_ctx(uid, ctx)
    logger.info("[session] context initialized: item=%s, category=%s, first_q=%s", item, category, first_q)

    first = (
        f"안녕하세요! 😊 '{item or '해당 상품'}' 사용 경험을 간단히 여쭤볼게요.\n\n"
        f"Q1) {first_q}"
    )
    return True, first
