import json, os
from typing import Optional, Dict, List

DATA_DIR = os.getenv("PROFILE_DIR", "data/profiles")

def _ensure():
    os.makedirs(DATA_DIR, exist_ok=True)

def profile_path(user_id: int) -> str:
    _ensure()
    return os.path.join(DATA_DIR, f"{user_id}.json")

def load(user_id: Optional[int]) -> Optional[Dict]:
    if not user_id:
        return None
    path = profile_path(user_id)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

def save(user_id: int, profile: Dict):
    path = profile_path(user_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(profile, f, ensure_ascii=False, indent=2)

def update_with_samples(user_id: int, tone_label: str, system_prompt: str, style_tags: List[str], samples: List[str]) -> Dict:
    prof = load(user_id) or {"userId": user_id, "history": []}
    prof["toneLabel"] = tone_label
    prof["systemPrompt"] = system_prompt
    prof["styleTags"] = style_tags
    prof["history"] = (prof.get("history") or []) + samples
    if len(prof["history"]) > 50:
        prof["history"] = prof["history"][-50:]
    save(user_id, prof)
    return prof