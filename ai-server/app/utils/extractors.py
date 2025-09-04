from __future__ import annotations
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from app.core.gpt_client import call_chatgpt
import json

class Extracted(BaseModel):
    product_name: Optional[str] = None
    pros: List[str] = []
    cons: List[str] = []
    price_feel: Optional[str] = Field(None, description="CHEAP|FAIR|EXPENSIVE")
    recommend: Optional[bool] = None
    recommend_reason: Optional[str] = None
    overall_score: Optional[int] = Field(None, description="1~5")

# ---- 시스템 프롬프트(판정) ----
JUDGE_SYS = """너는 한국어 인터뷰 답변 심사관이다.
반드시 JSON 한 줄로만 응답한다.
형식: {"ok": true|false, "move_on": false, "reason": "...", "reask": "...", "tips": "..."}
규칙:
- ok==true: 질문과 직접 관련된 '구체적 속성/효과/경험/사유'가 1개라도 포함.
- move_on 기본값은 false. (검증 통과 전에는 다음 질문으로 넘어가지 않음)
- reask는 같은 질문을 더 구체적으로 유도하는 1문장.
- tips는 예시 1~2개 (선택).
- JSON 이외 출력 금지.
"""

# ---- 메인지피티: 공감 + 유도 (퍼소나 반영) ----
def answer_and_refocus(user_text: str, next_question: str, ctx_snapshot: dict | None = None) -> str:
    """
    1~2문장 공감/짧은 리액션(필요시 위트 한 번), 그 다음 질문 한 줄로 마무리.
    - '다음 질문:' 같은 접두사/힌트 문구 금지
    - 사용자 멘트가 가벼워도 과장 금지
    - 마지막 문장은 질문 한 문장으로만 끝낼 것
    - 퍼소나(성별/연령대)가 있으면 말투 힌트로만 사용(반말/유행어 남발 금지)
    """
    persona = (ctx_snapshot or {}).get("persona") if isinstance(ctx_snapshot, dict) else None
    p_hint = ""
    if isinstance(persona, dict):
        g = persona.get("gender", "U")
        a = persona.get("ageRange", "U")
        p_hint = f"(말투 퍼소나 힌트: 성별={g}, 연령대={a}. 과도한 유행어/반말 금지, 담백하고 정중하게.)"

    sys = (
        "역할: 전자상거래 구매자 피드백 인터뷰어(한국어). 말투는 친근하고 담백. "
        "이모지는 가끔만(😊, 😄 정도). 농담/말장난은 한 번만 짧게 받아주고, 바로 본론으로. "
        "마지막은 질문 한 문장으로만."
    )
    ctx_txt = ""
    if ctx_snapshot:
        try:
            ctx_txt = json.dumps({
                "product_name": (ctx_snapshot.get("item") or
                                 ctx_snapshot.get("extracted", {}).get("product_name")),
                "category": ctx_snapshot.get("category"),
                "stage": ctx_snapshot.get("stage"),
            }, ensure_ascii=False)
        except Exception:
            ctx_txt = ""

    user = (
        f"{p_hint}\n"
        f"사용자 메시지:\n{user_text}\n\n"
        f"컨텍스트(참고): {ctx_txt}\n\n"
        f"위 메시지에 1~2문장으로 공감/간단 리액션(필요시 가벼운 위트 1회) 후, "
        f"아래 문장을 그대로 자연스럽게 물어봐 주세요.\n"
        f"질문(그대로 한 문장): {next_question}\n"
        f"중요: 마지막은 질문 한 문장으로만. 접두사/힌트/꼬리표 금지."
    )
    try:
        return call_chatgpt(0, sys, user, [], temperature=0.35, max_tokens=320)
    except Exception:
        # 모델 호출 실패 시 안전한 폴백
        return f"{next_question}"

# ---- 판정 지피티: 완화 + 긍/부정 항목 빠른 통과 ----
def judge_answer(question: str, user_text: str, prev_answers: Optional[List[str]] = None) -> dict:
    """
    반환: { ok:bool, move_on:bool, reason:str, reask:str, tips:str }
    - '구매 결정/요인' 계열: 다 떨어졌음/필요/세일/브랜드/리뷰/가격/품질 등 보이면 통과
    - '좋았던 점' 질문: 좋았/만족/편리/빠르/예쁘/튼튼 등 보이면 통과
    - '아쉬웠던 점' 질문: 아쉬/불편/느리/약하/무겁/세지/새고/잘 안/비쌈 등 보이면 통과
    - LLM 파싱 실패 시 **통과시키지 않는다(ok=False)** → 재질문 유도
    """
    import json as _json
    ql = (question or "").lower()
    ul = (user_text or "").lower()

    POS_KEYS = ["좋았", "만족", "가성비", "편리", "빠르", "예쁘", "튼튼", "부드럽", "잘 닦", "향이 좋", "추천"]
    NEG_KEYS = ["아쉬", "불편", "느리", "약하", "무겁", "세지", "새", "잘 안", "비쌈", "비싸", "끈적", "자극", "트러블"]

    # 구매 결정 계열 빠른 통과
    if any(k in ql for k in ["구매", "결정", "요인", "중요하게", "중요한 점"]):
        FAST = ["떨어졌", "소진", "필요", "세일", "할인", "브랜드", "리뷰", "재구매", "가격", "가성비", "품질"]
        if any(k in ul for k in FAST):
            return {"ok": True, "move_on": True, "reason": "decision fast-pass", "reask": "", "tips": ""}

    # 좋았던/아쉬웠던 점 빠른 통과
    if ("좋았던" in ql or "장점" in ql) and any(k in ul for k in POS_KEYS):
        return {"ok": True, "move_on": True, "reason": "pros fast-pass", "reask": "", "tips": ""}
    if ("아쉬웠던" in ql or "단점" in ql) and any(k in ul for k in NEG_KEYS):
        return {"ok": True, "move_on": True, "reason": "cons fast-pass", "reask": "", "tips": ""}

    prev = "\n- ".join(prev_answers or [])
    user_prompt = f"""
[판정 대상]
질문: {question}
이번 답변: {user_text}

[이전에 같은 질문에 대한 답변]
- {prev if prev else "(없음)"}

지시: 위 규칙에 따라 JSON 한 줄만 응답.
"""

    try:
        raw = call_chatgpt(0, JUDGE_SYS, user_prompt, [], temperature=0.0, max_tokens=220)
        data = _json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("bad json")
        # 안전 기본값 보정
        return {
            "ok": bool(data.get("ok")),
            "move_on": bool(data.get("move_on")) if "move_on" in data else False,
            "reason": str(data.get("reason") or ""),
            "reask": str(data.get("reask") or question),
            "tips": str(data.get("tips") or ""),
        }
    except Exception:
        # ❗ 실패 시에는 절대 통과시키지 않는다(보수적 게이팅)
        return {"ok": False, "move_on": False, "reason": "parse_fail", "reask": question, "tips": ""}
