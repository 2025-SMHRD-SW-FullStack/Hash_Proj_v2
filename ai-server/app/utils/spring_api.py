import os, httpx, requests, json
from dotenv import load_dotenv
load_dotenv()

BASE = os.getenv("API_SERVER_URL", "http://localhost:7777")

# FeedbackController @RequestMapping("/api/feedbacks")
CREATE_PATH = "/api/feedbacks"

# ✔ 선택 엔드포인트 2개
DONE_PRODUCT_PATH_TMPL = "/api/feedbacks/product/{productId}/done"     # GET
ELIGIBILITY_PATH = "/api/feedbacks/eligibility"                        # GET ?orderItemId=

# 기존: 주문아이템 기준 작성여부
DONE_ORDERITEM_PATH_TMPL = "/api/feedbacks/order-item/{orderItemId}/done"  # GET

def _hdr(token: str | None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h

def _ok_true_on_error() -> tuple[bool | None, str | None]:
    # 서버 미구현/장애 시 UX 위해 통과(최종 검증은 Spring이 수행)
    return True, None

def check_done_for_product(product_id: int, bearer_token: str | None) -> tuple[bool | None, str | None]:
    """
    GET {BASE}/api/feedbacks/product/{productId}/done
    응답: { "done": true|false }
    - done=True  → (False, "이미 해당 상품으로 작성하셨습니다.")
    - done=False → (True,  None)
    """
    url = f"{BASE.rstrip('/')}{DONE_PRODUCT_PATH_TMPL.format(productId=product_id)}"
    try:
        r = requests.get(url, headers=_hdr(bearer_token), timeout=5.0)
        if r.status_code != 200:
            return _ok_true_on_error()
        data = r.json() if r.text else {}
        done = bool(data.get("done", False))
        return (False, "이미 해당 상품으로 작성하셨습니다.") if done else (True, None)
    except Exception:
        return _ok_true_on_error()

def check_done_for_order_item(order_item_id: int, bearer_token: str | None) -> tuple[bool | None, str | None]:
    """
    GET {BASE}/api/feedbacks/order-item/{orderItemId}/done
    응답: { "done": true|false }
    - done=True  → (False, "이미 해당 주문에 대한 피드백이 등록되었습니다.")
    - done=False → (True,  None)
    """
    url = f"{BASE.rstrip('/')}{DONE_ORDERITEM_PATH_TMPL.format(orderItemId=order_item_id)}"
    try:
        r = requests.get(url, headers=_hdr(bearer_token), timeout=5.0)
        if r.status_code != 200:
            return _ok_true_on_error()
        data = r.json() if r.text else {}
        done = bool(data.get("done", False))
        return (False, "이미 해당 주문에 대한 피드백이 등록되었습니다.") if done else (True, None)
    except Exception:
        return _ok_true_on_error()

def check_eligibility(order_item_id: int, bearer_token: str | None) -> tuple[bool | None, str | None]:
    """
    GET {BASE}/api/feedbacks/eligibility?orderItemId=123
    응답 예: { "ok": true } or { "ok": false, "reason": "FEEDBACK_WINDOW_CLOSED" }
    - ok=False → (False, reason or 기본문구)
    - ok=True  → (True, None)
    비구현/에러 시 통과.
    """
    url = f"{BASE.rstrip('/')}{ELIGIBILITY_PATH}?orderItemId={order_item_id}"
    try:
        r = requests.get(url, headers=_hdr(bearer_token), timeout=5.0)
        if r.status_code != 200:
            return _ok_true_on_error()
        data = r.json() if r.text else {}
        ok = bool(data.get("ok", True))
        if not ok:
            reason = data.get("reason") or "피드백 작성 조건을 충족하지 않습니다."
            return False, reason
        return True, None
    except Exception:
        return _ok_true_on_error()

async def post_feedback(order_item_id: int, summary_text: str, extracted: dict, token: str | None) -> tuple[bool, str | None]:
    """
    POST {BASE}/api/feedbacks
    Body = FeedbackCreateRequest
      - orderItemId: Long
      - type: "AI"
      - overallScore: 1..5
      - scoresJson: String (JSON 문자열)
      - content: String (요약 결과)
      - imagesJson: String ("[]" 기본)
    """
    url = f"{BASE.rstrip('/')}{CREATE_PATH}"

    overall = int(extracted.get("overall_score") or 0)
    if overall < 1 or overall > 5:
        rec = extracted.get("recommend")
        if rec is True: overall = 5
        elif rec is False: overall = 3
        else: overall = 4

    scores_obj = {
        "price_feel": extracted.get("price_feel"),
        "pros_count": len(extracted.get("pros") or []),
        "cons_count": len(extracted.get("cons") or []),
        "recommend": extracted.get("recommend"),
        "recommend_reason": extracted.get("recommend_reason"),
    }
    payload = {
        "orderItemId": order_item_id,
        "type": "AI",
        "overallScore": overall,
        "scoresJson": json.dumps(scores_obj, ensure_ascii=False),
        "content": summary_text or "",
        "imagesJson": "[]",
    }

    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(url, json=payload, headers=_hdr(token), timeout=10.0)
            if r.status_code in (200, 201):
                return True, None
            return False, f"Spring 응답 {r.status_code}: {r.text}"
    except Exception as e:
        return False, str(e)
