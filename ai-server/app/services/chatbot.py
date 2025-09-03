from enum import Enum
from typing import Dict, Any
from app.services.state import get_ctx, upd_ctx, add_hist
from app.utils.extractors import extract_json, answer_and_refocus
from app.core.gpt_client import call_chatgpt
from app.utils.spring_api import post_feedback
import asyncio

class Step(str, Enum):
    PRODUCT = "PRODUCT"
    PROS = "PROS"
    CONS = "CONS"
    PRICE = "PRICE"
    RECOMMEND = "RECOMMEND"
    SCORE = "SCORE"
    SUMMARY = "SUMMARY"
    EDIT_OR_ACCEPT = "EDIT_OR_ACCEPT"
    DONE = "DONE"

def q_of(step: Step) -> str:
    return {
        Step.PRODUCT: "어떤 상품을 이용하셨나요?",
        Step.PROS: "좋았던 점을 1~3가지로 알려주세요.",
        Step.CONS: "아쉬웠던 점을 1~3가지로 알려주세요.",
        Step.PRICE: "가격은 어떠셨나요? (저렴/적당/비쌈 느낌)",
        Step.RECOMMEND: "지인에게 추천하시겠습니까? (예/아니오 + 이유)",
        Step.SCORE: "전체 만족도는 몇 점인가요? 1~5 중에서 숫자로만 알려주세요.",
        Step.SUMMARY: "답변을 바탕으로 요약을 만들고 있어요…",
        Step.EDIT_OR_ACCEPT: "요약을 확인해 주세요. 그대로 게시하거나 수정하실 수 있어요.",
        Step.DONE: "완료되었습니다.",
    }[step]

def next_of(step: Step) -> Step:
    order = [Step.PRODUCT, Step.PROS, Step.CONS, Step.PRICE, Step.RECOMMEND, Step.SCORE, Step.SUMMARY, Step.EDIT_OR_ACCEPT, Step.DONE]
    i = order.index(step)
    return order[min(i + 1, len(order) - 1)]

def prev_of(step: Step) -> Step:
    order = [Step.PRODUCT, Step.PROS, Step.CONS, Step.PRICE, Step.RECOMMEND, Step.SCORE]
    return order[max(0, order.index(step) - 1)] if step in order else Step.PRODUCT

def _intent(text: str) -> str:
    t = (text or "").lower().strip()
    if any(k in t for k in ["이전", "prev", "back"]): return "PREV"
    if any(k in t for k in ["처음", "reset", "리셋"]): return "RESET"
    if any(k in t for k in ["그만", "종료", "끝", "exit", "quit"]): return "EXIT"
    if any(k in t for k in ["수정", "edit"]): return "EDIT"
    if any(k in t for k in ["스킵", "skip", "넘어가"]): return "SKIP"
    return "NORMAL"

def _summarize(extracted: dict) -> str:
    sys = "너는 리뷰 에디터야. 깔끔하고 간결한 한국어로 작성해."
    user = f"""
다음 정보를 바탕으로 피드백 요약을 작성해.
- 한 문장 요약(제품명 포함)
- 좋았던 점: 불릿 1~3개
- 아쉬웠던 점: 불릿 1~3개
- 가격 한 줄 평가
- 추천 의향 한 줄 (예/아니오 + 이유)
정보: {extracted}
"""
    return call_chatgpt(0, sys, user, [], temperature=0.2, max_tokens=400)

def _offtopic_needed(step: Step, text: str) -> bool:
    t = (text or "").lower()
    if step == Step.PROS and any(k in t for k in ["좋", "만족", "장점"]): return False
    if step == Step.CONS and any(k in t for k in ["아쉬", "불만", "단점"]): return False
    if step == Step.PRICE and any(k in t for k in ["가격", "비싸", "저렴", "가성비"]): return False
    if step == Step.RECOMMEND and any(k in t for k in ["추천", "예", "아니오", "안함"]): return False
    if step == Step.SCORE and any(k in t for k in ["1","2","3","4","5"]): return False
    return "?" in t or "얼마" in t or "세금" in t or "배송" in t or "환불" in t

def reply_once(user_id: str, user_text: str, bearer: str | None):
    ctx = get_ctx(user_id)
    step = Step(ctx.get("stage", "PRODUCT"))
    add_hist(user_id, "user", user_text)

    it = _intent(user_text)
    if it == "RESET":
        upd_ctx(user_id, {"stage": "PRODUCT",
                          "extracted": {"product_name": None, "pros": [], "cons": [], "price_feel": None, "recommend": None, "recommend_reason": None, "overall_score": None},
                          "summary_text": None})
        return {
            "messages": [{"role": "assistant", "type": "text", "content": "처음부터 다시 진행할게요. 어떤 상품을 이용하셨나요?"}],
            "step": "PRODUCT",
            "context": get_ctx(user_id),
        }
    if it == "EXIT":
        upd_ctx(user_id, {"stage": "DONE"})
        return {
            "messages": [{"role": "assistant", "type": "text", "content": "대화를 종료할게요. 언제든 다시 시작하실 수 있어요!"}],
            "step": "DONE",
            "context": get_ctx(user_id),
        }
    if it == "PREV":
        p = prev_of(step)
        upd_ctx(user_id, {"stage": p.value})
        return {
            "messages": [{"role": "assistant", "type": "text", "content": "이전 단계로 돌아왔어요. " + q_of(p)}],
            "step": p.value,
            "context": get_ctx(user_id),
        }
    if it == "SKIP":
        n = next_of(step)
        upd_ctx(user_id, {"stage": n.value})
        return {
            "messages": [{"role": "assistant", "type": "text", "content": "건너뛸게요. " + q_of(n)}],
            "step": n.value,
            "context": get_ctx(user_id),
        }

    # GlobalGo 스타일: 오프토픽도 짧게 응대 후 원질문 리포커스
    if step in [Step.PROS, Step.CONS, Step.PRICE, Step.RECOMMEND, Step.SCORE] and _offtopic_needed(step, user_text):
        nxtq = q_of(step)
        text = answer_and_refocus(user_text, nxtq)
        add_hist(user_id, "assistant", text)
        return {"messages": [{"role": "assistant", "type": "text", "content": text}], "step": step.value, "context": get_ctx(user_id)}

    if step == Step.PRODUCT:
        cur = ctx.get("extracted", {})
        ex = extract_json("어떤 상품을 이용하셨나요?", user_text, cur).model_dump()
        if not ex.get("product_name"):
            ex["product_name"] = user_text.strip()[:80]
        upd_ctx(user_id, {"extracted": ex, "stage": Step.PROS.value})
        return {"messages": [{"role": "assistant", "type": "text", "content": q_of(Step.PROS)}], "step": "PROS", "context": get_ctx(user_id)}

    if step == Step.PROS:
        cur = ctx.get("extracted", {})
        ex = extract_json("상품의 좋았던 점을 알려주세요.", user_text, cur).model_dump()
        upd_ctx(user_id, {"extracted": ex, "stage": Step.CONS.value})
        return {"messages": [{"role": "assistant", "type": "text", "content": q_of(Step.CONS)}], "step": "CONS", "context": get_ctx(user_id)}

    if step == Step.CONS:
        cur = ctx.get("extracted", {})
        ex = extract_json("상품의 아쉬웠던 점을 알려주세요.", user_text, cur).model_dump()
        upd_ctx(user_id, {"extracted": ex, "stage": Step.PRICE.value})
        return {"messages": [{"role": "assistant", "type": "text", "content": q_of(Step.PRICE)}], "step": "PRICE", "context": get_ctx(user_id)}

    if step == Step.PRICE:
        cur = ctx.get("extracted", {})
        ex = extract_json("가격은 어떠셨나요? (저렴/적당/비쌈)", user_text, cur).model_dump()
        upd_ctx(user_id, {"extracted": ex, "stage": Step.RECOMMEND.value})
        return {"messages": [{"role": "assistant", "type": "text", "content": q_of(Step.RECOMMEND)}], "step": "RECOMMEND", "context": get_ctx(user_id)}

    if step == Step.RECOMMEND:
        cur = ctx.get("extracted", {})
        ex = extract_json("지인에게 추천하시겠습니까? (예/아니오 + 이유)", user_text, cur).model_dump()
        upd_ctx(user_id, {"extracted": ex, "stage": Step.SCORE.value})
        return {"messages": [{"role": "assistant", "type": "text", "content": q_of(Step.SCORE)}], "step": "SCORE", "context": get_ctx(user_id)}

    if step == Step.SCORE:
        cur = ctx.get("extracted", {})
        ex = extract_json("전체 만족도(1~5) 점수를 숫자로 알려주세요.", user_text, cur).model_dump()
        s = ex.get("overall_score")
        if isinstance(s, int) and not (1 <= s <= 5):
            ex["overall_score"] = None
        summ = _summarize(ex)
        upd_ctx(user_id, {"extracted": ex, "summary_text": summ, "stage": Step.EDIT_OR_ACCEPT.value})
        return {
            "messages": [{"role": "assistant", "type": "text", "content": summ + "\n\n이 요약으로 게시할까요, 아니면 수정할까요?"}],
            "step": "EDIT_OR_ACCEPT",
            "context": get_ctx(user_id),
            "summary_ready": True,
        }

    if step == Step.EDIT_OR_ACCEPT:
        if any(k in user_text for k in ["그대로", "게시", "확정", "네", "예", "좋아"]):
            ok, msg = _submit(user_id, bearer)
            if ok:
                upd_ctx(user_id, {"stage": Step.DONE.value})
                return {
                    "messages": [{"role": "assistant", "type": "text", "content": "게시 완료! 참여해주셔서 감사합니다."}],
                    "step": "DONE",
                    "context": get_ctx(user_id),
                }
            else:
                return {
                    "messages": [{"role": "assistant", "type": "text", "content": f"제출 실패: {msg}"}],
                    "step": "EDIT_OR_ACCEPT",
                    "context": get_ctx(user_id),
                }
        # treat as edit
        edited = call_chatgpt(
            0,
            "공손하고 간결한 톤을 유지해 수정해.",
            f"[원문]\n{ctx.get('summary_text','')}\n[지시]\n{user_text}",
            [],
            temperature=0.2,
            max_tokens=400,
        )
        upd_ctx(user_id, {"summary_text": edited})
        return {
            "messages": [{"role": "assistant", "type": "text", "content": edited + "\n\n이제 게시할까요?"}],
            "step": "EDIT_OR_ACCEPT",
            "context": get_ctx(user_id),
            "summary_ready": True,
        }

    return {"messages": [{"role": "assistant", "type": "text", "content": "무슨 말씀인지 잘 이해하지 못했어요. 다시 한 번 말씀해 주세요."}], "step": step.value, "context": get_ctx(user_id)}

def _submit(user_id: str, bearer: str | None):
    ctx = get_ctx(user_id)
    order_item_id = ctx.get("order_item_id")
    content = ctx.get("summary_text") or ""
    extracted = ctx.get("extracted") or {}
    token = ctx.get("access_token")
    if bearer and bearer.lower().startswith("bearer "):
        token = bearer.split(" ", 1)[1]
    ok, msg = asyncio.get_event_loop().run_until_complete(
        post_feedback(order_item_id, content, extracted, token)
    )
    return ok, msg

def accept_now(user_id: str, bearer: str | None):
    ctx = get_ctx(user_id)
    if not ctx.get("summary_text"):
        return False, "요약이 준비되어 있지 않습니다."
    ok, msg = _submit(user_id, bearer)
    if ok:
        upd_ctx(user_id, {"stage": Step.DONE.value})
        return True, "게시 완료! 참여해주셔서 감사합니다."
    return False, msg or "제출 실패"

def edit_summary(user_id: str, instructions: str):
    ctx = get_ctx(user_id)
    edited = call_chatgpt(
        0,
        "공손하고 간결한 톤을 유지해 수정해.",
        f"[원문]\n{ctx.get('summary_text','')}\n[지시]\n{instructions}",
        [],
        temperature=0.2,
        max_tokens=400,
    )
    upd_ctx(user_id, {"summary_text": edited, "stage": Step.EDIT_OR_ACCEPT.value})
    return {
        "messages": [{"role": "assistant", "type": "text", "content": edited + "\n\n이제 게시할까요?"}],
        "step": "EDIT_OR_ACCEPT",
        "context": get_ctx(user_id),
        "summary_ready": True,
    }
