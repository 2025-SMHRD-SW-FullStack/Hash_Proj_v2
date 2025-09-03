import os, json, redis
from typing import Dict, Any

def _k_ctx(uid: str) -> str: return f"ctx:{uid}"
def _k_hist(uid: str) -> str: return f"hist:{uid}"

redis_client = None
try:
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        decode_responses=True,
    )
    redis_client.ping()
    print("✅ Redis connected")
except Exception as e:
    print("⚠️ Redis not connected:", e)

DEFAULT = {
    "stage": "PRODUCT",
    "user_id": None,
    "order_item_id": None,
    "product_id": None,
    "access_token": None,
    "extracted": {
        "product_name": None,
        "pros": [],
        "cons": [],
        "price_feel": None,            # CHEAP | FAIR | EXPENSIVE
        "recommend": None,             # bool
        "recommend_reason": None,
        "overall_score": None,         # 1~5
    },
    "summary_text": None,
}

def get_ctx(uid: str) -> Dict[str, Any]:
    if not redis_client:
        return DEFAULT.copy()
    raw = redis_client.get(_k_ctx(uid))
    if not raw:
        redis_client.set(_k_ctx(uid), json.dumps(DEFAULT))
        return DEFAULT.copy()
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else DEFAULT.copy()
    except Exception:
        return DEFAULT.copy()

def set_ctx(uid: str, ctx: Dict[str, Any]):
    if not redis_client: return
    redis_client.set(_k_ctx(uid), json.dumps(ctx))

def upd_ctx(uid: str, updates: Dict[str, Any]):
    ctx = get_ctx(uid)
    ctx.update(updates)
    set_ctx(uid, ctx)

def add_hist(uid: str, role: str, content: str, maxlen: int = 10):
    if not redis_client: return
    redis_client.lpush(_k_hist(uid), json.dumps({"role": role, "content": content}))
    redis_client.ltrim(_k_hist(uid), 0, maxlen - 1)

def get_hist(uid: str) -> list[dict]:
    if not redis_client:
        return []
    arr = redis_client.lrange(_k_hist(uid), 0, -1)
    return [json.loads(x) for x in reversed(arr)]

# ===== Spring 연동: 3단 가드 =====
from app.utils.spring_api import (
    check_done_for_product,
    check_done_for_order_item,
    check_eligibility,
)

def init_session(user_id: int, order_item_id: int, product_id: int | None, bearer: str | None):
    uid = str(user_id)
    token = None
    if bearer and bearer.lower().startswith("bearer "):
        token = bearer.split(" ", 1)[1]

    # 1) 상품 기준 중복 작성 여부(선택 엔드포인트) — UX 선제 차단
    if product_id:
        ok, reason = check_done_for_product(product_id=product_id, bearer_token=token)
        if ok is False:
            return False, reason or "이미 해당 상품으로 피드백을 남기셨어요."

    # 2) 주문아이템 기준 중복 작성 여부 — 기존 가드
    ok, reason = check_done_for_order_item(order_item_id=order_item_id, bearer_token=token)
    if ok is False:
        return False, reason or "이미 해당 주문에 대한 피드백이 등록되었습니다."

    # 3) Eligibility 사전 검증(선택 엔드포인트) — 배송/확정/기간 등 사유 안내
    ok, reason = check_eligibility(order_item_id=order_item_id, bearer_token=token)
    if ok is False:
        return False, reason or "피드백 작성 조건을 충족하지 않습니다."

    # 통과 시 세션 컨텍스트 초기화
    ctx = DEFAULT.copy()
    ctx.update({
        "stage": "PRODUCT",
        "user_id": user_id,
        "order_item_id": order_item_id,
        "product_id": product_id,
        "access_token": token,
    })
    set_ctx(uid, ctx)
    return True, "안녕하세요! 이용하신 상품이 무엇인지부터 알려주세요."
