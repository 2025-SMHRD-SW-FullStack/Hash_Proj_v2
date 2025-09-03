import os, json, requests, logging
from typing import Tuple, Optional, Dict, Any

logger = logging.getLogger(__name__)

BASE = os.getenv("API_SERVER_URL", "http://localhost:7777")

# 필요시 .env 사용으로 전환하려면 아래 주석을 해제하고 위 하드코딩을 주석 처리
# CREATE_PATH = os.getenv("FEEDBACK_CREATE_PATH", "/api/feedbacks")
# ELIGIBILITY_PATH = os.getenv("FEEDBACK_ELIGIBILITY_PATH", "/api/feedbacks/eligibility")

CREATE_PATH = "/api/feedbacks"
DONE_PRODUCT_PATH_TMPL = "/api/feedbacks/product/{productId}/done"
DONE_ORDERITEM_PATH_TMPL = "/api/feedbacks/order-item/{orderItemId}/done"
ELIGIBILITY_PATH = "/api/feedbacks/eligibility"

def _hdr(token: Optional[str]):
    """Authorization 헤더 생성: 빈/잘못된 값이면 아예 보내지 않음"""
    h = {"Content-Type": "application/json"}
    tok = (token or "").strip()
    if not tok:
        return h
    if tok.lower().startswith("bearer "):
        tok = tok[7:].strip()
    if not tok:
        return h
    h["Authorization"] = f"Bearer {tok}"
    return h

def _ok_true_on_error() -> tuple[bool | None, str | None]:
    return True, None

# ---------- 작성 여부/자격 ----------
def check_done_for_product(product_id: int, bearer_token: Optional[str]) -> tuple[bool | None, str | None]:
    url = f"{BASE.rstrip('/')}{DONE_PRODUCT_PATH_TMPL.format(productId=product_id)}"
    try:
        r = requests.get(url, headers=_hdr(bearer_token), timeout=5.0)
        logger.info("[spring] GET %s -> %s", url, r.status_code)
        if r.status_code != 200:
            return _ok_true_on_error()
        data = r.json() if r.text else {}
        done = bool(data.get("done", False))
        return (False, "이미 해당 상품으로 작성하셨습니다.") if done else (True, None)
    except Exception as e:
        logger.warning("[spring] check_done_for_product error: %s", e)
        return _ok_true_on_error()

def check_done_for_order_item(order_item_id: int, bearer_token: Optional[str]) -> tuple[bool | None, str | None]:
    url = f"{BASE.rstrip('/')}{DONE_ORDERITEM_PATH_TMPL.format(orderItemId=order_item_id)}"
    try:
        r = requests.get(url, headers=_hdr(bearer_token), timeout=5.0)
        logger.info("[spring] GET %s -> %s", url, r.status_code)
        if r.status_code != 200:
            return _ok_true_on_error()
        data = r.json() if r.text else {}
        done = bool(data.get("done", False))
        return (False, "이미 해당 주문에 대한 피드백이 등록되었습니다.") if done else (True, None)
    except Exception as e:
        logger.warning("[spring] check_done_for_order_item error: %s", e)
        return _ok_true_on_error()

def check_eligibility(order_item_id: int, bearer_token: Optional[str]) -> tuple[bool | None, str | None]:
    url = f"{BASE.rstrip('/')}{ELIGIBILITY_PATH}?orderItemId={order_item_id}"
    try:
        r = requests.get(url, headers=_hdr(bearer_token), timeout=5.0)
        logger.info("[spring] GET %s -> %s", url, r.status_code)
        if r.status_code != 200:
            return _ok_true_on_error()
        data = r.json() if r.text else {}
        ok = bool(data.get("ok", True))
        if not ok:
            reason = data.get("reason") or "피드백 작성 조건을 충족하지 않습니다."
            return False, reason
        return True, None
    except Exception as e:
        logger.warning("[spring] check_eligibility error: %s", e)
        return _ok_true_on_error()

# ---------- 상품 메타(name, category) ----------
def get_product_meta(product_id: Optional[int], bearer_token: Optional[str], *,
                     fallback_order_item_id: Optional[int] = None) -> Dict[str, Any]:
    """
    name / category 둘 다 최대한 찾아서 반환. 없으면 {}.
    다양한 스프링 엔드포인트와 키를 탐색한다.
    """
    if not product_id and not fallback_order_item_id:
        return {}

    # 후보 엔드포인트
    candidates = []
    if product_id:
        candidates += [
            f"/api/products/{product_id}",
            f"/api/product/{product_id}",
            f"/api/v1/products/{product_id}",
            f"/api/items/{product_id}",
        ]
    # orderItem으로 우회 (상품 메타가 포함될 수도 있음)
    if fallback_order_item_id:
        candidates += [
            f"/api/order-items/{fallback_order_item_id}",
            f"/api/orders/items/{fallback_order_item_id}",
            f"/api/v1/order-items/{fallback_order_item_id}",
        ]

    name_keys = ["name", "productName", "title", "itemName"]
    cat_keys  = ["category", "categoryName", "category_name", "type", "productCategory"]

    for p in candidates:
        url = f"{BASE.rstrip('/')}{p}"
        try:
            r = requests.get(url, headers=_hdr(bearer_token), timeout=5.0)
            logger.info("[spring] GET %s -> %s", url, r.status_code)
            if r.status_code != 200:
                continue
            raw = r.json() if r.text else {}
            obj = raw.get("data", raw)  # data 래핑 대응
            # order-item 응답 안쪽에 product가 또 들어있을 수 있음
            if isinstance(obj, dict) and "product" in obj and isinstance(obj["product"], dict):
                obj = obj["product"]

            name = None
            category = None
            for k in name_keys:
                if k in obj and obj[k]:
                    name = str(obj[k]).strip()
                    break
            for k in cat_keys:
                if k in obj and obj[k]:
                    category = str(obj[k]).strip()
                    break

            if name or category:
                meta = {"name": name, "category": category}
                logger.info("[spring] product_meta resolved: %s", meta)
                return meta
        except Exception as e:
            logger.warning("[spring] get_product_meta error (%s): %s", url, e)

    logger.info("[spring] product_meta not found")
    return {}

# ---------- 게시 ----------
def post_feedback_to_spring(payload: dict, token: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    url = f"{BASE.rstrip('/')}{CREATE_PATH}"
    overall = int(payload.get("overallScore") or 0)
    if overall < 1 or overall > 5:
        overall = 4

    safe_payload = {
        "orderItemId": payload.get("orderItemId"),
        "type": payload.get("type") or "AI",
        "overallScore": overall,
        "scoresJson": payload.get("scoresJson") or "{}",
        "content": payload.get("content") or "",
        "imagesJson": payload.get("imagesJson") or "[]",
    }
    if "title" in payload:
        safe_payload["title"] = payload["title"]

    try:
        r = requests.post(url, json=safe_payload, headers=_hdr(token), timeout=10.0)
        logger.info("[spring] POST %s -> %s, resp=%s", url, r.status_code, r.text[:200])
        if r.status_code in (200, 201):
            return True, None
        return False, f"Spring 응답 {r.status_code}: {r.text}"
    except Exception as e:
        logger.error("[spring] post_feedback_to_spring error: %s", e)
        return False, str(e)
