import os, re, logging, json
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional

from app.core.gpt_client import call_chatgpt
from app.services.state import (
    get_user_context, update_user_context,
    add_chat_to_redis, get_chat_history
)
from app.repositories.chatbot_repository import save_chat_message
from app.models.chatbot_message import RoleEnum
from app.utils.spring_api import post_feedback_to_spring
from app.utils.database import SessionLocal
from app.config.questions import normalize_category
from app.utils.extractors import answer_and_refocus

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(level=LOG_LEVEL,
                        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

REASK_LIMIT = 3

# ====== 슬롯 추론/가이드 ======
SLOT_PATTERNS: Dict[str, List[str]] = {
    "reason": ["구매", "산", "이유", "목적"],
    "pros": ["만족", "좋았", "장점", "마음에"],
    "cons": ["아쉬", "불편", "단점", "싫었"],
    "price": ["가격", "가성비", "비싸", "저렴", "할인"],
    "battery": ["배터리", "지속", "충전"],
    "fit": ["착용", "귀", "편안", "아프"],
    "connectivity": ["연결", "블루투스", "끊김", "호환"],
    "sound": ["음질", "소리", "사운드"],
    "design": ["디자인", "외형", "색상", "마감"],
}

SLOT_TIPS: Dict[str, str] = {
    "reason": "언제/어디서 쓰려고 샀는지, 다른 후보와 비교, 예산·할인/구매경로 중 1~2가지만 더 알려주세요.",
    "pros": "가장 만족한 순간이나 상황, 이전 제품 대비 좋아진 점을 한 가지만 더 적어주세요.",
    "cons": "불편했던 상황(언제·어디서·얼마나 자주)과 그 영향(포기/교환 고민 등) 중 1가지만 더요.",
    "price": "체감 가격대(비쌈/적당/저렴), 지불 가격(세일 여부), '그 값 한다/아니다' 중 하나만 짚어주세요.",
    "battery": "연속 사용 시간, 충전 속도, 케이스 포함 총 사용일수 등 실제 수치를 간단히.",
    "fit": "착용 시간/귀 모양 영향, 바꾼 이어팁/사이즈, 움직일 때 빠짐 여부 등 1~2개만.",
    "connectivity": "연결 소요 시간, 기기 전환 편의, 끊김이 생긴 장소(지하철 등) 여부.",
    "sound": "저음/중음/고음 중 어느 대역이 만족/아쉬웠는지, 볼륨 최댓값 체감.",
    "design": "색상/광택/로고·마감, 지문/스크래치, 케이스 휴대성 중 1~2개만.",
}

GENERIC_ANSWERS = {"그냥", "보통", "그럭저럭", "나쁘지", "괜찮", "모르겠", "음", "웅", "응", "네"}

# ====== (추가) 슬롯별 템플릿 질문: 중복 회피용 ======
SLOT_TEMPLATES: Dict[str, List[str]] = {
    "reason": [
        "이 제품을 고르신 가장 큰 이유가 무엇이었나요?",
        "구매 전 비교했던 다른 후보가 있었다면 무엇이었고 왜 이 제품으로 결정하셨나요?",
        "주 사용 상황(출퇴근/운동/업무 등)을 기준으로 선택하신 건가요?"
    ],
    "pros": [
        "사용하시면서 가장 만족스러웠던 점 하나만 꼽아주실 수 있을까요? 이유도 함께 부탁드려요.",
        "이전 제품과 비교해서 특히 좋아진 부분이 있었다면 무엇인가요?"
    ],
    "cons": [
        "사용 중 불편했거나 아쉬웠던 점이 있었다면 언제/어떤 상황이었는지 알려주세요.",
        "되돌릴 수 있다면 바꾸고 싶은 한 가지를 꼽자면 무엇일까요?"
    ],
    "price": [
        "체감 가격대는 어땠나요? 비쌌다/적당했다/저렴했다 중에 선택해 주시면 돼요.",
        "구매가와 할인 여부를 포함해 가성비에 대한 느낌을 한 줄로 알려주세요."
    ],
    "battery": [
        "배터리 지속 시간은 실제 사용에서 어느 정도였나요? 대략적인 시간으로 괜찮아요.",
        "충전 속도나 케이스 포함 사용일수에 대해 기억나는 점이 있을까요?"
    ],
    "fit": [
        "착용감은 어땠나요? 장시간 착용 시 통증이나 빠짐은 없었나요?",
        "이어팁/사이즈를 바꾸어 보셨다면 어떤 변화가 있었나요?"
    ],
    "connectivity": [
        "연결 속도와 기기 전환 편의성은 어땠나요?",
        "사용 중 끊김이 생겼던 환경(지하철/엘리베이터 등)이 있었는지 알려주세요."
    ],
    "sound": [
        "음질은 어떤 편이었나요? 저음/중음/고음 중 만족스러웠던 대역이 있었나요?",
        "노이즈캔슬링 성능은 체감상 어떻다고 느끼셨나요?"
    ],
    "design": [
        "디자인/색상/마감에서 특히 마음에 든 부분이 있었나요?",
        "휴대성(케이스 크기/무게)이나 지문/스크래치 등 마감 품질은 어땠나요?"
    ],
    "other": [
        "전체적인 사용 경험을 한 문장으로 요약하면 무엇이라고 말할 수 있을까요?"
    ]
}

def _guess_slot_from_question(q: str) -> str | None:
    ql = (q or "").lower()
    for slot, kws in SLOT_PATTERNS.items():
        if any(k.lower() in ql for k in kws):
            return slot
    return None

def _is_generic(text: str) -> bool:
    """
    '짧고 뭉뚱그린' 답만 generic 으로 간주하고,
    길거나 구체적 표현이 섞인 답은 generic으로 보지 않도록 완화.
    """
    if not text or not text.strip():
        return True
    s = text.strip().lower()
    if len(s) <= 3:
        return True
    EXACT_SHORT = {"음", "웅", "응", "네"}
    if s in EXACT_SHORT:
        return True
    is_shortish = (len(s) <= 12) or (s.count(" ") < 2)
    VAGUE_SUBSTR = {"그냥", "보통", "그럭저럭", "나쁘지", "괜찮", "모르겠"}
    if is_shortish and any(kw in s for kw in VAGUE_SUBSTR):
        return True
    return False

def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())

def _already_asked(ctx: Dict[str, Any], q: str) -> bool:
    nq = _norm(q)
    if not nq:
        return False
    if _norm(ctx.get("last_q") or "") == nq:
        return True
    for a in (ctx.get("answers") or []):
        if _norm(a.get("q") or "") == nq:
            return True
    return False

def _pick_alternative_question(ctx: Dict[str, Any], plan_slot: str, missing_slots: List[str]) -> str | None:
    answers = ctx.get("answers") or []
    asked_qs = {_norm(a.get("q") or "") for a in answers}
    if ctx.get("last_q"):
        asked_qs.add(_norm(ctx["last_q"]))
    asked_slots = set(ctx.get("asked_slots") or [])
    for s in (missing_slots or []):
        if s in asked_slots:
            continue
        for q in SLOT_TEMPLATES.get(s, []):
            if _norm(q) not in asked_qs:
                return q
    for s, qs in SLOT_TEMPLATES.items():
        if s in asked_slots:
            continue
        for q in qs:
            if _norm(q) not in asked_qs:
                return q
    return None

FRUSTRATION_HINTS = ["아까 대답", "이미 말했", "같은 질문", "중복", "또 물어"]

# ====== 플래너 & 리뷰 생성 프롬프트 ======
PLANNER_PROMPT = """
역할: 후기(200~350자)를 만들기 위한 인터뷰어.
입력: 제품 정보 + 지금까지의 Q/A + [이미 물어본 질문 목록] + [이미 다룬 주제 슬롯].

판단:
- 핵심 요소 4개 이상(구매 이유, 장점, 단점, 가격/가성비, 사용성/연결/지속력 등)이 있으면 충분.
- 부족하면 need_more=true, 다음에 물을 "한 가지 질문"만 제시.
- 다음 질문이 겨냥한 주제를 slot로 명시(택1):
  [reason, pros, cons, price, battery, fit, connectivity, sound, design, other]
- 충분하면 need_more=false, next_question="", slot="".

중복/반복 금지(엄수):
- [이미 물어본 질문 목록]에 있는 문구는 절대 반복하지 말 것.
- [이미 다룬 주제 슬롯]은 다시 묻지 말 것(같은 슬롯 연속 금지).
- 불가피할 경우에도 다른 슬롯을 우선 선택하라.

반환(JSON 한 줄):
{"need_more": true|false, "next_question": "...", "slot": "reason|pros|cons|price|battery|fit|connectivity|sound|design|other", "missing_slots": ["...","..."]}

주의: 반드시 JSON 한 줄만 반환.
"""

REVIEW_JSON_PROMPT = """
다음 정보를 바탕으로 200~350자 한국어 후기 본문을 만들고 JSON 한 줄만 반환하라.
형식:
{"content":"...", "overall_score": 1, "price_feel":"CHEAP|FAIR|EXPENSIVE", "recommend":"YES|NO|UNKNOWN"}

작성 지침(엄수):
- 1인칭 존댓말, 자연스러운 구어체. 과장/광고문구 금지.
- 입력 Q/A에 등장한 사실만 사용(추정/창작 금지). 구체 수치·조건 그대로 반영.
- 문장 길이와 리듬을 다양화: 짧은 문장 1개 이상 섞기(예: "그래서 만족했습니다.").
- 접속어는 반복되지 않게(그래서/다만/한편/대신 등).
- "전반적으로 무난하다" 같은 빈약한 결말 금지. 마지막은 개인적 총평 한 문장.

반환은 반드시 JSON 한 줄만.
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

def _ui_step_from_stage(stage: str) -> str:
    mapping = {"start":"INIT","qna":"QNA","compose":"COMPOSING","confirm":"EDIT_OR_ACCEPT","done":"DONE"}
    return mapping.get(stage or "qna", "QNA")

# ====== 플래너 호출 ======
def _plan_next_question(user_id: str, item: str, category: str, answers: List[Dict[str,str]]) -> Dict[str, Any]:
    ctx = get_user_context(user_id) or {}
    asked_slots = ctx.get("asked_slots") or []
    asked_qs = [ (a.get("q") or "").strip() for a in (ctx.get("answers") or []) if (a.get("q") or "").strip() ]

    qa_txt = "\n".join([
        f"- Q: {x.get('q')}\n  A: {x.get('a')}"
        for x in answers if (x.get('a') or '').strip()
    ])
    asked_qs_txt = "\n".join([f"- {q}" for q in asked_qs]) or "- (없음)"
    asked_slots_txt = ", ".join(asked_slots) or "(없음)"

    user_prompt = (
        f"[제품명] {item or '알수없음'}\n"
        f"[카테고리] {category or '일반'}\n"
        f"[지금까지의 Q/A]\n{qa_txt or '- (아직 없음)'}\n\n"
        f"[이미 물어본 질문 목록]\n{asked_qs_txt}\n"
        f"[이미 다룬 주제 슬롯]\n{asked_slots_txt}\n"
        f"(위 질문/슬롯은 절대 반복 금지)"
    )

    raw = call_chatgpt(
        user_id=f"{user_id}-planner",
        system_prompt=PLANNER_PROMPT,
        user_prompt=user_prompt,
        chat_history=[],
        temperature=0.2
    )
    import json
    try:
        data = json.loads(str(raw))
        return {
            "need_more": bool(data.get("need_more")),
            "next_question": (data.get("next_question") or "").strip(),
            "slot": (data.get("slot") or "").strip() or "other",
            "missing_slots": data.get("missing_slots") or []
        }
    except Exception:
        return {"need_more": True, "next_question": "사용하시며 가장 만족스러웠던 점을 상황과 이유까지 간단히 알려주세요.", "slot": "pros", "missing_slots": ["pros"]}

class ChatbotService:
    logger.info("✅ ChatbotService (no-duplicate, guided follow-up) 로딩됨")

    def handle(self, db: Session, user_id: str, message: str) -> dict:
        msg = (message or "").strip()
        ctx = get_user_context(user_id) or {}
        stage = ctx.get("stage") or "qna"

        save_chat_message(db, user_id, RoleEnum.user, msg)
        add_chat_to_redis(user_id, "user", msg)

        msg_l = msg.lower()

        # 중복 질문 짜증 감지 → 다음 슬롯으로
        if any(k in msg_l for k in FRUSTRATION_HINTS):
            return self._ack_and_next(db, user_id, "그 부분은 이미 답변으로 받았어요. 다음으로 넘어가 볼게요.")

        # reset
        if any(k in msg_l for k in ["처음","처음부터","리셋","다시 시작"]):
            update_user_context(user_id, {"stage":"qna","answers":[],"summary":None,"reask_counts":{},"last_q":None,"asked_slots":[]})
            return self._ask_or_compose(db, user_id, force_new_question=True)

        if stage == "qna":
            return self._ingest_and_ask(db, user_id, msg)

        if stage == "compose":
            if msg:
                answers: List[Dict[str, str]] = (ctx.get("answers") or []) + [{"q":"자유 서술","a":msg}]
                update_user_context(user_id, {"answers": answers})
            return self._compose_and_preview(db, user_id)

        if stage == "confirm":
            if msg_l.startswith("수정:"):
                inst = message.split("수정:", 1)[1].strip()
                return self._edit_review(db, user_id, inst)

            # 키워드/패턴 기반 자연어 수정
            if re.search(r"(수정|고쳐|바꿔|다듬|말투|톤|짧게|길게|줄여|늘려|빼줘|넣어줘|캐주얼|격식|맞춤법)", msg_l):
                return self._edit_review(db, user_id, message)

            # 네/예
            if any(x in msg_l for x in ["네","예","응","ㅇㅇ","ok","오케이","그래","yes","y"]):
                return self._submit_feedback(db, user_id)
            # 아니오
            if any(x in msg_l for x in ["아니오","아니요","ㄴㄴ","노","no","n"]):
                return self._say(db, user_id, "알겠습니다. 바꾸고 싶은 점을 편하게 말씀해 주세요. 예: '더 캐주얼하게', '배터리 부분은 빼줘'")

            return self._say(db, user_id,
                "바로 게시할까요? (예/아니오)\n"
                "수정 원하시면 편하게 말해 주세요. 예) '더 캐주얼하게', '배터리 부분은 빼줘', '3문장으로 줄여줘'"
            )

        if stage == "done":
            if any(k in msg_l for k in ["다시","처음","리셋"]):
                update_user_context(user_id, {"stage":"qna","answers":[],"summary":None,"reask_counts":{},"last_q":None,"asked_slots":[]})
                return self._ask_or_compose(db, user_id, force_new_question=True)
            return self._say(db, user_id, "더 도와드릴 것이 있을까요? 😊")

        return self._ask_or_compose(db, user_id, force_new_question=False)

    # -------- helpers --------
    def _ack_and_next(self, db: Session, user_id: str, ack: str) -> dict:
        ctx = get_user_context(user_id) or {}
        add = ack + "\n\n" + "다음 질문으로 넘어가겠습니다."
        save_chat_message(db, user_id, RoleEnum.assistant, add)
        return self._ask_or_compose(db, user_id, force_new_question=True)

    def _ingest_and_ask(self, db: Session, user_id: str, user_text: str) -> dict:
        ctx = get_user_context(user_id) or {}
        answers: List[Dict[str,str]] = ctx.get("answers") or []
        last_q = ctx.get("last_q") or ""
        asked_slots: List[str] = ctx.get("asked_slots") or []

        if _is_generic(user_text):
            if last_q:
                answers = answers + [{"q": last_q, "a": user_text}]
                slot = _guess_slot_from_question(last_q)
                if slot and slot not in asked_slots:
                    asked_slots.append(slot)
                update_user_context(user_id, {"answers": answers, "asked_slots": asked_slots})

            item = ctx.get("item") or ""
            category = normalize_category(ctx.get("category"))
            plan = _plan_next_question(user_id, item, category, answers)

            if plan.get("need_more") is False:
                update_user_context(user_id, {"stage": "compose"})
                return self._compose_and_preview(db, user_id)

            next_q = (plan.get("next_question") or "").strip() or "사용하시며 가장 만족스러웠던 점을 알려주실 수 있을까요?"

            if _norm(next_q) == _norm(last_q):
                for alt in [
                    "이 제품을 고르신 이유가 있었나요?",
                    "사용하면서 아쉬웠던 점이 있었나요?",
                    "가격대나 가성비는 어떻게 느끼셨나요?",
                    "배터리나 연결 안정성은 어땠나요?",
                ]:
                    if _norm(alt) != _norm(last_q):
                        next_q = alt
                        break

            update_user_context(user_id, {"last_q": next_q})
            return self._say(
                db, user_id,
                answer_and_refocus(
                    user_text=user_text,
                    next_question=next_q,
                    ctx_snapshot=get_user_context(user_id)
                )
            )

        if last_q:
            answers = answers + [{"q": last_q, "a": user_text}]
            slot = _guess_slot_from_question(last_q)
            if slot and slot not in asked_slots:
                asked_slots.append(slot)
            update_user_context(user_id, {"answers": answers, "asked_slots": asked_slots})

        return self._ask_or_compose(db, user_id, force_new_question=False, react_text=user_text)

    def _ask_or_compose(self, db: Session, user_id: str, force_new_question: bool, react_text: str | None = None) -> dict:
        ctx = get_user_context(user_id) or {}
        item = ctx.get("item") or ""
        category = normalize_category(ctx.get("category"))
        answers: List[Dict[str,str]] = ctx.get("answers") or []
        asked_slots: List[str] = ctx.get("asked_slots") or []
        last_q = ctx.get("last_q") or ""

        plan = _plan_next_question(user_id, item, category, answers)

        if not force_new_question and plan.get("need_more") is False:
            update_user_context(user_id, {"stage": "compose"})
            return self._compose_and_preview(db, user_id)

        next_q = (plan.get("next_question") or "").strip()
        next_slot = (plan.get("slot") or "").strip() or "other"
        missing_slots = plan.get("missing_slots") or []

        if (not next_q) or _already_asked(get_user_context(user_id) or {}, next_q) or (next_slot in asked_slots and next_slot != "other"):
            alt = _pick_alternative_question(get_user_context(user_id) or {}, next_slot, missing_slots)
            next_q = alt or next_q or "사용하시며 가장 인상적이었던 순간을 한 가지만 알려주실 수 있을까요?"

        update_user_context(user_id, {"last_q": next_q})

        if react_text:
            composed = answer_and_refocus(
                user_text=react_text,
                next_question=next_q,
                ctx_snapshot=get_user_context(user_id)
            )
            return self._say(db, user_id, composed)

        return self._say(db, user_id, next_q)

    def _compose_and_preview(self, db: Session, user_id: str) -> dict:
        ctx = get_user_context(user_id) or {}
        category = normalize_category(ctx.get("category"))
        item = ctx.get("item") or ""
        answers: List[Dict[str, str]] = ctx.get("answers") or []
        persona = ctx.get("persona") or {"gender":"U","ageRange":"U"}

        qa_txt = "\n".join([f"- Q: {x.get('q')}\n  A: {x.get('a')}" for x in answers if (x.get('a') or '').strip()])
        tone_hint = f"(말투 퍼소나: 성별={persona.get('gender','U')}, 연령대={persona.get('ageRange','U')}. 유행어/반말 금지, 자연스럽고 담백하게.)"

        user_prompt = (
            f"[제품명] {item}\n"
            f"[카테고리] {category}\n"
            f"[Q/A]\n{qa_txt if qa_txt else '- (비어있음)'}\n\n"
            f"{tone_hint}\n"
            f"위 자료로 지시된 JSON 한 줄을 만들어 주세요. (200~350자)"
        )

        raw = call_chatgpt(
            user_id=user_id,
            system_prompt=REVIEW_JSON_PROMPT,
            user_prompt=user_prompt,
            chat_history=[],
            temperature=0.7
        )
        review = parse_review_json(str(raw))

        if not review.get("content"):
            update_user_context(user_id, {"stage": "qna"})
            return self._ask_or_compose(db, user_id, force_new_question=True)

        update_user_context(user_id, {"review": review, "stage": "confirm"})
        preview = (
            "✍️ 작성한 후기 초안입니다:\n\n"
            f"{review['content']}\n\n"
            "바로 게시할까요? (예/아니오)\n"
            "수정 원하시면 편하게 말해 주세요.\n"
            "원하시는 문장 톤/길이/포함 내용 등도 지시 가능합니다."
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
        raw = call_chatgpt(user_id=user_id, system_prompt="", user_prompt=edit_prompt, chat_history=[], temperature=0.55)
        review = parse_review_json(str(raw))
        if not review.get("content"):
            return self._say(db, user_id, "수정 결과가 비어있어요. 다른 방식으로 지시해 주세요.")
        update_user_context(user_id, {"review": review})

        msg = (
            "수정했습니다. 한 번 더 확인해 주세요.\n\n"
            f"{review['content']}\n\n"
            "바로 게시할까요? (예/아니오)\n"
            "추가로 바꿀 점이 있으면 편하게 말씀해 주세요.\n"
            "원하시는 문장 톤/길이/포함 내용 등도 지시 가능합니다."
        )
        return self._say(db, user_id, msg)

    def _submit_feedback(self, db: Session, user_id: str) -> dict:
        ctx = get_user_context(user_id) or {}
        r = ctx.get("review") or {}
        order_item_id = ctx.get("orderItemId") or ctx.get("order_item_id")
        product_id = ctx.get("productId") or ctx.get("product_id")
        token = ctx.get("access_token")

        if not token:
            return self._say(db, user_id, "로그인이 만료된 것 같아요. 새로고침 후 다시 시도해 주세요.")
        if not order_item_id:
            return self._say(db, user_id, "주문 정보가 누락되었어요. 에디터로 돌아가 다시 시작해 주세요.")
        if not product_id:
            return self._say(db, user_id, "상품 정보가 누락되었어요. 에디터로 돌아가 다시 시작해 주세요.")
        if not r or not (r.get("content") or "").strip():
            update_user_context(user_id, {"stage": "qna"})
            return self._ask_or_compose(db, user_id, force_new_question=True)

        payload = {
            "orderItemId": int(order_item_id),
            "productId": int(product_id),                 # ✅ 추가: NOT NULL 컬럼
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

def _sanitize_image_urls(urls: Optional[List[str]]) -> list[str]:
    if not urls:
        return []
    safe = []
    for u in urls:
        if not isinstance(u, str):
            continue
        u2 = u.strip()
        if not u2.startswith(("https://", "http://")):
            continue
        # 확장자 체크
        lower = u2.lower()
        if not any(lower.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif")):
            continue
        # 한 URL 너무 길면 스킵(비정상 data-uri 방지)
        if len(u2) > 1024:
            continue
        safe.append(u2)

    # 중복 제거 + 최대 5장
    dedup = []
    seen = set()
    for u in safe:
        if u not in seen:
            seen.add(u)
            dedup.append(u)
    dedup = dedup[:5]

    # JSON 직렬화 길이 상한(보수적으로 4000바이트)
    while True:
        s = json.dumps(dedup, ensure_ascii=False)
        if len(s.encode("utf-8")) <= 4000 or not dedup:
            break
        dedup.pop()  # 뒤에서부터 하나씩 줄임
    return dedup


@_with_db
def accept_now(db: Session, user_id: str, bearer: str | None = None, images: Optional[List[str]] = None):
    if bearer:
        b = bearer.strip()
        if b.lower().startswith("bearer "):
            b = b[7:].strip()
        if b:
            update_user_context(user_id, {"access_token": b})

    # ✅ 업로더에서 받은 퍼블릭 URL 배열을 컨텍스트에 기록
    if images is not None:
        safe = _sanitize_image_urls(images)
        update_user_context(user_id, {"imagesJson": json.dumps(safe, ensure_ascii=False)})

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
