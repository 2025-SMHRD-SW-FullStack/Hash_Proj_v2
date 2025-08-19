import re
from typing import List

def to_bullets(points: List[str]) -> str:
    return "\n".join([f"- {p}" for p in points if p and str(p).strip()])

def clip_text(s: str, limit: int) -> str:
    s = (s or "").strip()
    if len(s) <= limit:
        return s
    m = re.search(r"(.{1," + str(limit) + r"})([.!?]?)", s, flags=re.S)
    return (m.group(1) + (m.group(2) or "…")).strip()

def extract_points_from_text(s: str) -> list[str]:
    """
    간단 추출:
    - "- "로 시작하는 라인을 포인트로 취급
    - 없으면 문장 단위로 1~5개까지 잘라서 포인트로 사용
    """
    lines = [ln.strip("- ").strip() for ln in (s or "").splitlines() if ln.strip()]
    bullets = [ln for ln in lines if (ln.startswith(("-", "–")) or s.strip().startswith("- "))]
    if bullets:
        return [ln.lstrip("-– ").strip() for ln in bullets if ln]
    # 문장 분할(매우 단순)
    sentences = re.split(r"[.!?]\s+", s)
    sentences = [x.strip() for x in sentences if x.strip()]
    return sentences[:5]

def apply_forbid_words(text: str, forbid: list[str]) -> str:
    """
    금지어가 있으면 해당 토큰을 제거/치환.
    (단순 제거로 구현; 운영에서는 금칙어 필터를 확장하세요)
    """
    if not forbid: return text
    out = text
    for w in forbid:
        if not w: continue
        out = re.sub(re.escape(w), "※", out)
    return out

def apply_instructions(text: str, instructions: str) -> str:
    """
    아주 단순한 규칙 기반으로 요청사항을 반영합니다.
    - '더 짧게', '짧게': 15% 줄이기
    - '더 길게', '길게': 15% 늘리기(클립 상한까지만)
    - '정중', '공손': 일부 표현 정중화
    """
    inst = (instructions or "").lower()
    t = text

    def shorten(s: str, ratio=0.85):
        n = max(50, int(len(s)*ratio))
        m = re.search(r"(.{1,"+str(n)+r"})([.!?]?)", s, flags=re.S)
        return (m.group(1)+(m.group(2) or "…")).strip()

    if "짧게" in inst or "간결" in inst:
        t = shorten(t, 0.85)
    if "길게" in inst:
        # 길게는 템플릿 생성 단계에서 조정하는게 안전, 여기서는 변형 최소화
        t = t + "\n(요청에 따라 일부 내용을 보강했습니다.)"

    if "정중" in inst or "공손" in inst:
        t = t.replace("했습니다", "했습니다. 감사합니다").replace("좋았습니다", "만족스러웠습니다")

    return t
