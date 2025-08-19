"""
사용자 말투 프로필 저장소 (MySQL 기반)
- 파일 기반과 동일 인터페이스 제공
"""
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from .db_models import UserStyleProfile

MAX_HISTORY = 50

def _dedup(samples: List[str]) -> List[str]:
    seen = set()
    result = []
    for s in samples or []:
        key = (s or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(key)
    return result

def load(db: Session, user_id: Optional[int]) -> Optional[Dict]:
    if not user_id:
        return None
    row = db.get(UserStyleProfile, user_id)
    if not row:
        return None
    return {
        "userId": row.user_id,
        "toneLabel": row.tone_label,
        "systemPrompt": row.system_prompt,
        "styleTags": row.style_tags or [],
        "history": row.history or []
    }

def save(db: Session, user_id: int, prof: Dict):
    row = db.get(UserStyleProfile, user_id)
    if not row:
        row = UserStyleProfile(user_id=user_id)
    row.tone_label   = prof.get("toneLabel")
    row.system_prompt= prof.get("systemPrompt")
    row.style_tags   = prof.get("styleTags") or []
    row.history      = prof.get("history") or []
    db.add(row)
    db.flush()

def update_with_samples(db: Session, user_id: int, tone_label: str, system_prompt: str, style_tags: List[str], samples: List[str]) -> Dict:
    prof = load(db, user_id) or {"userId": user_id, "history": []}
    prof["history"] = _dedup((prof.get("history") or []) + (samples or []))[-MAX_HISTORY:]
    prof["toneLabel"] = tone_label
    prof["systemPrompt"] = system_prompt
    prof["styleTags"] = style_tags or []
    save(db, user_id, prof)
    return prof