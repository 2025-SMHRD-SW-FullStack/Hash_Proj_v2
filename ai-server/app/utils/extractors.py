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

def _merge(a: dict, b: dict) -> dict:
    out = dict(a)
    for k, v in (b or {}).items():
        if v in (None, [], "", {}): 
            continue
        out[k] = v
    return out

def extract_json(question: str, user_text: str, current: dict) -> Extracted:
    prompt = f"""
다음 답변에서 필요한 정보를 **JSON으로만** 추출하세요. JSON 외 텍스트 금지.
스키마:
{{
  "product_name": string|null,
  "pros": string[],
  "cons": string[],
  "price_feel": "CHEAP"|"FAIR"|"EXPENSIVE"|null,
  "recommend": true|false|null,
  "recommend_reason": string|null,
  "overall_score": 1|2|3|4|5|null
}}
- overall_score는 사용자가 1~5 점수를 명시하면 반영, 없으면 null
[질문]
{question}
[답변]
{user_text}
[현재값]
{json.dumps(current, ensure_ascii=False)}
"""
    try:
        raw = call_chatgpt(
            0, "", prompt, [], temperature=0.0, max_tokens=500
        )
        data = json.loads(raw)
        merged = _merge(current, data if isinstance(data, dict) else {})
        return Extracted(**merged)
    except Exception:
        return Extracted(**current)

def answer_and_refocus(user_text: str, next_question: str) -> str:
    """
    오프토픽 처리: 짧게(2~3문장) 친절히 답하고 마지막 줄에 '다음 질문: <...>' 붙여 복귀.
    """
    sys = (
        "너는 고객 지원 어시스턴트야. 사용자의 질문이 현재 단계와 무관하더라도, "
        "간단하고 친절하게 2~3문장으로 답한 뒤 자연스럽게 다음 질문으로 유도해. "
        "과한 이모지는 피하고, 마지막 줄에 다음 질문을 그대로 붙여줘."
    )
    user = f"사용자 메시지: {user_text}\n\n마지막 줄에 그대로 이 문장을 붙여줘: 다음 질문: {next_question}"
    try:
        txt = call_chatgpt(0, sys, user, [], temperature=0.2, max_tokens=300)
        return txt
    except Exception:
        return f"간단히 답변을 드렸어요.\n\n다음 질문: {next_question}"
