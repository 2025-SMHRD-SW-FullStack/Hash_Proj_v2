from typing import List, Dict, Optional
from app.prompts.review_templates import BASE_TEMPLATE, PLATFORM_HINTS
from app.utils.text_utils import to_bullets, clip_text, extract_points_from_text, apply_forbid_words, apply_instructions
from app.services.image_analysis_service import ImageAnalysisService  # ★ 추가
import os

class ReviewGenerationService:
    def __init__(self):
        self.image_analyzer = ImageAnalysisService()

    # OCR 기반 힌트(사진 없거나 실패 시 개수 힌트만)
    def _image_hints(self, image_list: List[str] | None) -> List[str]:
        if not image_list:
            return []
        try:
            analysis = self.image_analyzer.analyze(image_list, payload=None)
            hints = analysis.get("hints") or []
            return hints[:10]
        except Exception:
            # 실패 시에도 최소 개수 힌트는 남김
            return [f"첨부 사진 {len(image_list)}장 기반 디테일 강조"]

    def resolve_limit(self, platform: Optional[str], desired: Optional[int]) -> int:
        p = (platform or "default").lower()
        base = PLATFORM_HINTS.get(p, PLATFORM_HINTS["default"])["length"]
        if desired is None:
            return base
        return max(200, min(desired, base))

    def _collect_image_sources(self, payload: Dict) -> List[str]:
        sources: List[str] = []
        for k in ("imagePaths", "imageUrls"):
            v = payload.get(k) or []
            if isinstance(v, list):
                sources.extend(v)
            elif v:
                sources.append(v)
        # 순서 보존 중복 제거
        seen = set()
        return [x for x in sources if x and (x not in seen and not seen.add(x))]

    def generate(self, payload: Dict, style_override: Optional[Dict] = None) -> Dict:
        # 1) 이미지 소스
        image_sources: List[str] = self._collect_image_sources(payload)

        # 2) 이미지 기반 힌트(OCR)
        image_hints = self._image_hints(image_sources)

        # 3) 기본 필드
        platform = (payload.get("platform") or "default").lower()
        brand = payload.get("brand") or payload.get("storeName") or "매장"
        menu = payload.get("menu") or payload.get("productName") or ""
        keywords: List[str] = payload.get("keywords") or []

        # 4) 포인트 합성: (사진 힌트 + 요청 포인트 or 키워드) → 10개 컷
        base_points: List[str] = payload.get("points") or keywords
        seen = set()
        merged_points: List[str] = []
        for x in (image_hints + base_points):
            if x and (x not in seen):
                merged_points.append(x)
                seen.add(x)
            if len(merged_points) >= 10:
                break
        payload["points"] = merged_points

        # 5) 길이 제한
        desired_len = payload.get("desiredLength")
        limit = self.resolve_limit(platform, desired_len)

        # 6) 스타일
        style = payload.get("style") or {}
        if style_override:
            style = {**style, **style_override}
        tone = style.get("toneLabel") or "담백"
        sys_prompt = style.get("systemPrompt") or ""

        # 7) 템플릿 조립
        hint = PLATFORM_HINTS.get(platform, PLATFORM_HINTS["default"])
        bullets = to_bullets(merged_points or ["맛/서비스/가격/분위기 순으로 간단 평가"])
        keywords_text = ", ".join(keywords[:8])
        length_hint = str(limit)

        text = BASE_TEMPLATE.format(
            platform=platform,
            tone=tone,
            length_hint=length_hint,
            keywords_text=keywords_text or "—",
            intro=hint["intro"].format(brand=brand, menu=menu),
            body=hint["body"].format(bullets=bullets),
            outro=hint["outro"].format(hashtags=" ".join(f"#{k}" for k in keywords[:5]))
        )

        # 8) 지시문/금칙어/재작성 반영
        instructions = (payload.get("instructions") or "").strip()
        forbid = payload.get("forbidWords") or []
        rewrite_from = payload.get("rewriteFrom")

        if rewrite_from and not merged_points:
            extra = extract_points_from_text(rewrite_from)
            if extra:
                extra = extra[:10]
                payload["points"] = extra
                text = text + "\n" + to_bullets(extra)

        text = clip_text(text, limit)
        text = apply_instructions(text, instructions)
        text = apply_forbid_words(text, forbid)

        return {
            "platform": platform,
            "limit": limit,
            "tone": tone,
            "systemPromptUsed": sys_prompt,
            "content": text,
            "keywordsUsed": keywords[:10]
        }
