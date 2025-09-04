import os
import logging
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.core.gpt_client import call_chatgpt
from app.services.state import (
    get_user_context, update_user_context,
    add_chat_to_redis, get_chat_history
)
from app.repositories.chatbot_repository import save_chat_message
from app.models.chatbot_message import RoleEnum
from app.utils.spring_api import post_feedback_to_spring
from app.utils.database import SessionLocal

from app.utils.extractors import answer_and_refocus, judge_answer
from app.config.questions import build_question_flow, normalize_category

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(level=LOG_LEVEL,
                        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

MAX_HISTORY = 10
REASK_LIMIT = 3   # ← 증가

REVIEW_JSON_PROMPT = """
다음 정보를 바탕으로 '사용자가 직접 쓴 후기 댓글 본문'을 만들고 JSON 한 줄로만 반환하라.
형식(키 고정):
{"content":"...", "overall_score": 1, "price_feel":"CHEAP|FAIR|EXPENSIVE", "recommend":"YES|NO|UNKNOWN"}
작성 지침:
- 1인칭, 한국어, 일상적인 구어체.
- 길이 6~9문장.
- 답변으로 제공된 Q/A 내용만 근거로 사용. 없는 사실은 추정/창작 금지.
- 제품명/카테고리를 자연스레 포함 가능.
- 맞춤법 준수, 광고문구 지양.
"""

def parse_review_json(raw: str):
    import json
    try:
        data = json.loads(raw)
        return {
            "content": str(data.get("content") or "").strip(),
            "overall_score": int(data.get("overall_score") or 0),
            "price_feel": str(data.get("price_feel") or "UNKNOWN").upper(),
            "recommend": str(data.get("recommend") or "UNKNOWN").upper(),
        }
    except Exception:
        return {"content": (raw or "").strip(), "overall_score": 0, "price_feel": "UNKNOWN", "recommend": "UNKNOWN"}

_POSITIVE_HINTS = [
    "가성비","합리","만족","만족스러","좋","괜찮","효과","효능","트러블","자극","보습",
    "흡수","발림","끈적","건조","유분","디자인","사이즈","크기","색상","내구","성능",
    "속도","배터리","소음","발열","포장","배송","편리","불편","추천","비추천","비교","비해서","보다",
    "떨어졌","필요","선물","할인","세일","행사","브랜드","리뷰","재구매","가격","품질"
]
_NEGATIVE_NOISE = ["몰라","모르겠","글쎄","ㅎㅎ","ㅋㅋ","ㅠㅠ","^^","ㅇㅇ","응","네","예"]

def _soft_meaningful(question: str, text: str) -> bool:
    s = (text or "").strip().lower()
    if not s or any(n in s for n in _NEGATIVE_NOISE):
        return False
    ql = (question or "").lower()
    if any(k in ql for k in ["구매","결정","요인","중요하게","중요한 점"]):
        return any(k in s for k in _POSITIVE_HINTS) or len(s) >= 4
    return len(s) >= 6 and any(k in s for k in _POSITIVE_HINTS)

def _ui_step_from_stage(stage: str) -> str:
    mapping = {
        "start": "INIT",
        "qna": "QNA",
        "compose": "COMPOSING",
        "confirm": "EDIT_OR_ACCEPT",
        "done": "DONE",
    }
    return mapping.get(stage or "qna", "QNA")

class ChatbotService:
    logger.info("✅ ChatbotService (validated flow) 로딩됨")

    def handle(self, db: Session, user_id: str, message: str) -> dict:
        msg = (message or "").strip()
        ctx = get_user_context(user_id) or {}
        stage = ctx.get("stage") or "qna"
        q_idx = int(ctx.get("q_idx") or 0)

        logger.debug(f"[handle] uid={user_id} stage={stage} q_idx={q_idx} msg='{msg}'")

        save_chat_message(db, user_id, RoleEnum.user, msg)
        add_chat_to_redis(user_id, "user", msg)

        msg_l = msg.lower()

        # reset
        if any(k in msg_l for k in ["처음","처음부터","리셋","다시 시작"]):
            q_flow = build_question_flow(ctx.get("category"))
            update_user_context(user_id, {
                "stage":"qna","q_idx":0,"answers":[],"q_flow":q_flow,
                "review":None,"reask_counts":{}
            })
            q0 = (q_flow or ["가장 인상 깊었던 점을 알려주세요."])[0]
            return self._say(db, user_id, f"처음부터 다시 진행할게요.\n\nQ1) {q0}")

        if stage == "start":
            q_flow = build_question_flow(ctx.get("category"))
            update_user_context(user_id, {"stage":"qna","q_idx":0,"q_flow":q_flow,"answers":[],"reask_counts":{}})
            first_q = q_flow[0] if q_flow else "가장 인상 깊었던 점을 알려주세요."
            return self._say(db, user_id, f"바로 시작해볼게요.\n\nQ1) {first_q}")

        # Q&A 단계
        if stage == "qna":
            q_flow = ctx.get("q_flow") or []
            if not q_flow or q_idx >= len(q_flow):
                update_user_context(user_id, {"stage":"compose"})
                return self._compose_and_preview(db, user_id)

            cur_q = q_flow[q_idx]
            reask_counts: Dict[str, int] = ctx.get("reask_counts") or {}
            prev_for_this_q = [a["a"] for a in (ctx.get("answers") or []) if a.get("q") == cur_q]

            # 1차 휴리스틱, 2차 LLM 판정
            if _soft_meaningful(cur_q, msg):
                ok = True
            else:
                verdict = judge_answer(cur_q, msg, prev_answers=prev_for_this_q)
                ok = bool(verdict.get("ok"))
                reask = verdict.get("reask") or cur_q
                tips  = verdict.get("tips") or ""

            if not ok:
                count = int(reask_counts.get(str(q_idx), 0))
                if count < REASK_LIMIT:
                    reask_counts[str(q_idx)] = count + 1
                    update_user_context(user_id, {"reask_counts": reask_counts})
                    suffix = f"\n{tips}" if tips else ""
                    return self._say(
                        db, user_id,
                        answer_and_refocus(user_text=msg, next_question=reask, ctx_snapshot=get_user_context(user_id)) + suffix
                    )
                # 리밋 초과: 여전히 같은 질문을 유지(다음으로 넘어가지 않음)
                return self._say(
                    db, user_id,
                    answer_and_refocus(
                        user_text=msg,
                        next_question=f"조금만 더 구체적으로 부탁드려요. {cur_q}",
                        ctx_snapshot=get_user_context(user_id)
                    )
                )

            # 저장 후 다음 질문
            ans = {"q": cur_q, "a": msg}
            answers: List[Dict[str, str]] = (ctx.get("answers") or []) + [ans]
            update_user_context(user_id, {"answers": answers})

            q_idx += 1
            if q_idx < len(q_flow):
                update_user_context(user_id, {"q_idx": q_idx})
                next_q = q_flow[q_idx]
                return self._say(
                    db, user_id,
                    answer_and_refocus(user_text=msg, next_question=next_q, ctx_snapshot=get_user_context(user_id))
                )

            update_user_context(user_id, {"stage":"compose"})
            return self._compose_and_preview(db, user_id)

        if stage == "compose":
            if msg:
                answers: List[Dict[str, str]] = (ctx.get("answers") or []) + [{"q":"자유 서술","a":msg}]
                update_user_context(user_id, {"answers": answers})
            return self._compose_and_preview(db, user_id)

        if stage == "confirm":
            if msg_l.startswith("수정:"):
                inst = message.split("수정:", 1)[1].strip()
                return self._edit_review(db, user_id, inst)

            if any(x in msg_l for x in ["네","예","응","ㅇㅇ","ok","오케이","그래","yes","y"]):
                return self._submit_feedback(db, user_id)

            if any(x in msg_l for x in ["아니오","아니요","ㄴㄴ","노","no","n"]):
                return self._say(db, user_id, "알겠습니다. 수정하실 내용이 있다면 '수정: ~~~' 로 알려주세요.")

            return self._say(db, user_id, "게시하시려면 '네', 수정은 '수정: ~~~' 형태로 알려주세요.")

        if stage == "done":
            if any(k in msg_l for k in ["다시","처음","리셋"]):
                update_user_context(user_id, {"stage":"start","q_idx":0,"review":None,"answers":[],"q_flow":[],"reask_counts":{}})
                return self._say(db, user_id, "처음부터 다시 진행할게요.")
            return self._say(db, user_id, "더 도와드릴 것이 있을까요? 😊")

        return self._say(db, user_id, "도와드릴게요. 곧 질문을 이어가겠습니다.")

    # -------- helpers --------
    def _compose_and_preview(self, db: Session, user_id: str) -> dict:
        ctx = get_user_context(user_id) or {}
        category = normalize_category(ctx.get("category"))
        item = ctx.get("item") or ""
        answers: List[Dict[str, str]] = ctx.get("answers") or []
        persona = ctx.get("persona") or {"gender":"U","ageRange":"U"}

        # 오직 answers 기반으로만 생성
        qa_txt = "\n".join([f"- Q: {x.get('q')}\n  A: {x.get('a')}" for x in answers if (x.get('a') or '').strip()])

        # 퍼소나 힌트
        tone_hint = f"(말투 퍼소나: 성별={persona.get('gender','U')}, 연령대={persona.get('ageRange','U')}. 과도한 유행어/반말 금지, 정중하고 담백하게.)"

        user_prompt = (
            f"[제품 카테고리] {category}\n"
            f"[제품명] {item}\n"
            f"[질문과 답변]\n{qa_txt if qa_txt else '- (아직 유의미한 답변 없음)'}\n\n"
            f"{tone_hint}\n"
            f"위 자료를 바탕으로 지시된 JSON 한 줄을 만들어 주세요."
        )

        # 히스토리는 미사용(오염 방지)
        raw = call_chatgpt(user_id=user_id, system_prompt=REVIEW_JSON_PROMPT, user_prompt=user_prompt, chat_history=[], temperature=0.4)
        review = parse_review_json(str(raw))

        # 유의미한 본문 없으면 작성 중지하고 보완 요구
        if not review.get("content"):
            return self._say(db, user_id, "아직 본문을 만들기 어렵습니다. 조금 더 구체적으로 답변 부탁드려요.")

        update_user_context(user_id, {"review": review, "stage": "confirm"})

        preview = (
            "✍️ 작성한 후기 초안입니다:\n\n"
            f"{review['content']}\n\n"
            "👉 이대로 게시할까요? (네/아니오)\n"
            "또는 '수정: ~~~' 형태로 문장 톤/길이/포함 내용 등을 지시해 주세요."
        )
        return self._say(db, user_id, preview)

    def _edit_review(self, db: Session, user_id: str, instructions: str) -> dict:
        ctx = get_user_context(user_id) or {}
        r = ctx.get("review") or {}
        category = normalize_category(ctx.get("category"))
        item = ctx.get("item") or ""
        persona = ctx.get("persona") or {"gender":"U","ageRange":"U"}

        edit_prompt = f"""
다음 리뷰 본문을 지시에 맞춰 자연스럽게 손봐라. JSON 한 줄만 반환.
카테고리: {category}
제품명: {item}
퍼소나: 성별={persona.get('gender','U')}, 연령대={persona.get('ageRange','U')}
지시: {instructions}
원문: {r}
형식: {{"content":"...", "overall_score": 1, "price_feel":"CHEAP|FAIR|EXPENSIVE", "recommend":"YES|NO|UNKNOWN"}}
"""
        raw = call_chatgpt(user_id=user_id, system_prompt="", user_prompt=edit_prompt, chat_history=[], temperature=0.4)
        review = parse_review_json(str(raw))
        if not review.get("content"):
            return self._say(db, user_id, "수정 결과가 비어있어요. 다른 방식으로 지시해 주세요.")
        update_user_context(user_id, {"review": review})

        msg = (
            "수정했어요. 한 번 더 확인해 주세요.\n\n"
            f"{review['content']}\n\n"
            "👉 게시할까요? (네/아니오)"
        )
        return self._say(db, user_id, msg)

    def _submit_feedback(self, db: Session, user_id: str) -> dict:
        ctx = get_user_context(user_id) or {}
        r = ctx.get("review") or {}
        order_item_id = ctx.get("orderItemId") or ctx.get("order_item_id")
        token = ctx.get("access_token")

        if not token:
            return self._say(db, user_id, "로그인이 만료된 것 같아요. 새로고침 후 다시 시도해 주세요.")
        if not order_item_id:
            return self._say(db, user_id, "주문 정보가 누락되었어요. 에디터로 돌아가 다시 시작해 주세요.")
        if not r or not (r.get("content") or "").strip():
            update_user_context(user_id, {"stage": "compose"})
            return self._say(db, user_id, "아직 초안이 없어요. 먼저 미리보기를 만들어 볼게요.")

        payload = {
            "orderItemId": order_item_id,
            "type": "AI",
            "overallScore": int(r.get("overall_score") or 0),
            "scoresJson": "{}",
            "content": r.get("content") or "",
            "imagesJson": ctx.get("imagesJson") or "[]",
        }

        ok, api_msg = post_feedback_to_spring(payload, token=token)
        update_user_context(user_id, {"stage": "done"})
        done = "✅ 피드백 게시 완료! 감사합니다 😊" if ok else f"❌ 게시 실패: {api_msg}"
        return self._say(db, user_id, done)

    def _say(self, db: Session, user_id: str, text: str) -> dict:
        save_chat_message(db, user_id, RoleEnum.assistant, text)
        add_chat_to_redis(user_id, "assistant", text)
        # 응답에 현재 스테이지/요약 준비 여부 포함 (프런트 요구)
        ctx = get_user_context(user_id) or {}
        stage = ctx.get("stage") or "qna"
        return {
            "messages": [{"role": "assistant", "type": "text", "content": text}],
            "step": _ui_step_from_stage(stage),
            "summary_ready": (stage == "confirm"),
        }

# ---------- FastAPI 엔드포인트용 래퍼 ----------
_service_singleton = ChatbotService()

def _with_db(fn):
    def wrapper(*args, **kwargs):
        db = SessionLocal()
        try:
            return fn(db, *args, **kwargs)
        finally:
            db.close()
    return wrapper

@_with_db
def reply_once(db: Session, user_id: str, user_text: str, bearer: str | None = None):
    if bearer:
        b = bearer.strip()
        if b.lower().startswith("bearer "):
            b = b[7:].strip()
        if b:
            update_user_context(user_id, {"access_token": b})
    return _service_singleton.handle(db, user_id=user_id, message=user_text)

@_with_db
def accept_now(db: Session, user_id: str, bearer: str | None = None):
    if bearer:
        b = bearer.strip()
        if b.lower().startswith("bearer "):
            b = b[7:].strip()
        if b:
            update_user_context(user_id, {"access_token": b})
    out = _service_singleton._submit_feedback(db, user_id=user_id)
    try:
        msg = out["messages"][-1]["content"]
        ok = msg.startswith("✅")
        return ok, msg
    except Exception:
        return False, "알 수 없는 응답 형식입니다."

@_with_db
def edit_summary(db: Session, user_id: str, instructions: str):
    return _service_singleton._edit_review(db, user_id=user_id, instructions=instructions)

__all__ = ("reply_once", "accept_now", "edit_summary", "ChatbotService")
