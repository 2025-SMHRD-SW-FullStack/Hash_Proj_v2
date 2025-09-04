# app/config/questions.py
from typing import List, Dict, Optional

# 공통 질문 (좋았던/아쉬웠던 점을 분리)
COMMON_QUESTIONS: List[str] = [
    "구매 결정에 가장 큰 요인은 무엇인가요?",
    "가격 대비 품질이나 기능이 합리적이라고 느끼셨나요?",
    "다른 제품과 비교했을 때 좋았던 점은 무엇인가요?",
    "다른 제품과 비교했을 때 아쉬웠던 점은 무엇인가요?",
    "재구매 의사가 있다면 이유는 무엇인가요? 없다면 이유가 무엇인가요?",
]

CATEGORY_QUESTIONS: Dict[str, List[str]] = {
    "전자제품": [
        "디자인이나 외형(색상, 크기, 마감 품질)은 어땠나요?",
        "제품 설명서나 가이드는 이해하기 쉬웠나요?",
    ],
    "화장품": [
        "본인의 피부 타입과 잘 맞았나요? (건성/지성/복합성/민감성 중)",
        "용기나 패키지는 사용하기 편리했나요? (펌프/튜브 등)",
    ],
    "무형자산": [
        "사용법을 익히는 데 어려움이 있었나요?",
        "가격 정책이나 과금 체계(무료/유료, 구독료 등)에 대해 만족하시나요?",
    ],
    "밀키트": [
        "레시피 설명은 이해하기 쉬웠나요?",
        "보관하기에 편리했나요? (유통기한, 포장 사이즈, 냉장·냉동 적합성)",
    ],
}

CATEGORY_ALIASES = {
    "electronics": "전자제품",
    "appliance": "전자제품",
    "beauty": "화장품",
    "cosmetics": "화장품",
    "service": "무형자산",
    "software": "무형자산",
    "subscription": "무형자산",
    "meal": "밀키트",
    "mealkit": "밀키트",
    "foodkit": "밀키트",
}

def normalize_category(raw: Optional[str]) -> str:
    if not raw:
        return "일반"
    s = str(raw).strip().lower()
    for k, v in CATEGORY_ALIASES.items():
        if k in s:
            return v
    if raw in CATEGORY_QUESTIONS:
        return raw
    return "일반"

def build_question_flow(category_label: Optional[str]) -> List[str]:
    cat = normalize_category(category_label)
    return COMMON_QUESTIONS + CATEGORY_QUESTIONS.get(cat, [])
