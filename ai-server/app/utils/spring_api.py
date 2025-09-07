import os
import json
import requests
import logging
from typing import Tuple, Optional, Dict, Any

logger = logging.getLogger(__name__)

# ── BASE URL: SPRING_BASE_URL → API_SERVER_URL → default
_BASE_ENV = (os.getenv("SPRING_BASE_URL") or os.getenv("API_SERVER_URL") or "http://localhost:7777").strip()
BASE = _BASE_ENV.rstrip("/")

# 경로 상수
CREATE_PATH = "/api/feedbacks"
DONE_PRODUCT_PATH_TMPL = "/api/feedbacks/product/{productId}/done"
DONE_ORDERITEM_PATH_TMPL = "/api/feedbacks/order-item/{orderItemId}/done"
ELIGIBILITY_PATH = "/api/feedbacks/eligibility"
ME_PATH = "/api/me"

# ──────────────────────────────────────────────────────────────────────────────
# 헤더 유틸

def _bearer(token: Optional[str]) -> Optional[str]:
    """토큰이 있으면 무조건 Bearer 접두사로 표준화."""
    if not token:
        return None
    t = token.strip()
    if not t:
        return None
    if not t.lower().startswith("bearer "):
        t = f"Bearer {t}"
    return t

def _hdr(token: Optional[str], *, json_body: bool) -> Dict[str, str]:
    """
    Authorization 헤더 생성. GET 등에는 json_body=False로 넘겨 Content-Type 미지정.
    """
    h: Dict[str, str] = {}
    if json_body:
        h["Content-Type"] = "application/json"

    bt = _bearer(token)
    if bt:
        h["Authorization"] = bt

    # 안전 디버그(토큰 길이만 기록)
    if logger.isEnabledFor(logging.DEBUG):
        logger.debug(
            "[spring_api] headers prepared: auth=%s, token_len=%s, json_body=%s",
            "on" if bt else "off",
            len(bt) if bt else 0,
            json_body,
        )
    return h

def _ok_true_on_error() -> Tuple[bool | None, str | None]:
    # 조회류 실패 시 '작성 가능(true)'로 낙관 처리
    return True, None

def _resp_message(resp: requests.Response) -> str:
    try:
        data = resp.json()
        if isinstance(data, dict):
            return str(data.get("message") or data.get("error") or f"HTTP {resp.status_code}")
    except Exception:
        pass
    txt = (resp.text or "").strip()
    return txt if txt else f"HTTP {resp.status_code}"

# ──────────────────────────────────────────────────────────────────────────────
# 작성 여부/자격

def check_done_for_product(product_id: int, bearer_token: Optional[str]) -> Tuple[bool | None, str | None]:
    url = f"{BASE}{DONE_PRODUCT_PATH_TMPL.format(productId=product_id)}"
    try:
        r = requests.get(url, headers=_hdr(bearer_token, json_body=False), timeout=5.0)
        logger.info("[spring] GET %s -> %s", url, r.status_code)
        if r.status_code != 200:
            return _ok_true_on_error()
        data = r.json() if r.text else {}
        done = bool(data.get("done", False))
        return (False, "이미 해당 상품으로 작성하셨습니다.") if done else (True, None)
    except Exception as e:
        logger.warning("[spring] check_done_for_product error: %s", e)
        return _ok_true_on_error()

def check_done_for_order_item(order_item_id: int, bearer_token: Optional[str]) -> Tuple[bool | None, str | None]:
    url = f"{BASE}{DONE_ORDERITEM_PATH_TMPL.format(orderItemId=order_item_id)}"
    try:
        r = requests.get(url, headers=_hdr(bearer_token, json_body=False), timeout=5.0)
        logger.info("[spring] GET %s -> %s", url, r.status_code)
        if r.status_code != 200:
            return _ok_true_on_error()
        data = r.json() if r.text else {}
        done = bool(data.get("done", False))
        return (False, "이미 해당 주문에 대한 피드백이 등록되었습니다.") if done else (True, None)
    except Exception as e:
        logger.warning("[spring] check_done_for_order_item error: %s", e)
        return _ok_true_on_error()

def check_eligibility(order_item_id: int, bearer_token: Optional[str]) -> Tuple[bool | None, str | None]:
    url = f"{BASE}{ELIGIBILITY_PATH}?orderItemId={order_item_id}"
    try:
        r = requests.get(url, headers=_hdr(bearer_token, json_body=False), timeout=5.0)
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

# ──────────────────────────────────────────────────────────────────────────────
# 상품 메타(name, category)

def get_product_meta(
    product_id: Optional[int],
    bearer_token: Optional[str],
    *,
    fallback_order_item_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    name / category 둘 다 최대한 찾아서 반환. 없으면 {}.
    다양한 스프링 엔드포인트와 키를 탐색한다.
    """
    if not product_id and not fallback_order_item_id:
        return {}

    candidates = []
    if product_id:
        candidates += [
            f"/api/products/{product_id}",
            f"/api/product/{product_id}",
            f"/api/v1/products/{product_id}",
            f"/api/items/{product_id}",
        ]
    if fallback_order_item_id:
        candidates += [
            f"/api/order-items/{fallback_order_item_id}",
            f"/api/orders/items/{fallback_order_item_id}",
            f"/api/v1/order-items/{fallback_order_item_id}",
        ]

    name_keys = ["name", "productName", "title", "itemName"]
    cat_keys  = ["category", "categoryName", "category_name", "type", "productCategory"]

    for p in candidates:
        url = f"{BASE}{p}"
        try:
            r = requests.get(url, headers=_hdr(bearer_token, json_body=False), timeout=5.0)
            logger.info("[spring] GET %s -> %s", url, r.status_code)
            if r.status_code != 200:
                continue
            raw = r.json() if r.text else {}
            obj = raw.get("data", raw)
            if isinstance(obj, dict) and isinstance(obj.get("product"), dict):
                obj = obj["product"]

            name = next((str(obj[k]).strip() for k in name_keys if k in obj and obj[k]), None)
            category = next((str(obj[k]).strip() for k in cat_keys if k in obj and obj[k]), None)

            if name or category:
                meta = {"name": name, "category": category}
                logger.info("[spring] product_meta resolved: %s", meta)
                return meta
        except Exception as e:
            logger.warning("[spring] get_product_meta error (%s): %s", url, e)

    logger.info("[spring] product_meta not found")
    return {}

# ──────────────────────────────────────────────────────────────────────────────
# 현재 사용자(퍼소나)

def get_me(bearer_token: Optional[str]) -> Dict[str, Any]:
    url = f"{BASE}{ME_PATH}"
    try:
        r = requests.get(url, headers=_hdr(bearer_token, json_body=False), timeout=5.0)
        logger.info("[spring] GET %s -> %s", url, r.status_code)
        if r.status_code != 200:
            return {}
        data = r.json() if r.text else {}
        obj: Dict[str, Any] = data.get("data", data) if isinstance(data, dict) else {}

        if isinstance(obj, dict) and isinstance(obj.get("user"), dict):
            obj = obj["user"]

        out = {
            "gender": obj.get("gender"),
            "birthDate": obj.get("birthDate") or obj.get("birth_date"),
            "nickname": obj.get("nickname"),
        }
        return {k: v for k, v in out.items() if v is not None}
    except Exception as e:
        logger.warning("[spring] get_me error: %s", e)
        return {}

# ──────────────────────────────────────────────────────────────────────────────
# 게시

def post_feedback_to_spring(payload: dict, token: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    url = f"{BASE}{CREATE_PATH}"

    # 점수 보정
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

    # 토큰 없는 경우는 바로 에러 반환(프런트에서 이미 체크하지만 방어)
    if not _bearer(token):
        return False, "인증이 필요합니다."

    try:
        r = requests.post(url, json=safe_payload, headers=_hdr(token, json_body=True), timeout=10.0)
        # 본문은 너무 길 수 있으니 앞부분만 로깅
        snippet = (r.text or "")[:200].replace("\n", " ")
        logger.info("[spring] POST %s -> %s, resp=%s", url, r.status_code, snippet)

        if r.status_code in (200, 201):
            try:
                data = r.json() if r.text else {}
            except Exception:
                data = {}
            return True, data

        # 스프링 표준 에러 포맷이면 메시지 우선
        msg = _resp_message(r)

        # 401 별도 처리 힌트
        if r.status_code == 401:
            return False, (msg or "Unauthorized")

        return False, (msg or f"Spring 응답 {r.status_code}")
    except Exception as e:
        logger.error("[spring] post_feedback_to_spring error: %s", e)
        return False, str(e)
