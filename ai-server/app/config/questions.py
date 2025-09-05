# app/config/questions.py
from typing import Optional

# 카테고리 영문/변형 → 한글 정규화만 유지
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
    # 이미 한글 카테고리로 들어온 경우 유지
    if str(raw).strip() in ("전자제품", "화장품", "무형자산", "밀키트"):
        return str(raw).strip()
    return "일반"
