from typing import Optional

def clip(text: str, char_limit: Optional[int]) -> str:
    if not char_limit or char_limit <= 0:
        return text
    if len(text) <= char_limit:
        return text
    return text[:char_limit].rstrip() + "…"
