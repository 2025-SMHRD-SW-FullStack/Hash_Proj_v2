from typing import List, Optional, Dict
import os
from openai import OpenAI

from app.prompts.review_templates import build_platform_template
from app.utils.text_utils import clip

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ReviewGenerationService:

    def _compose_system_prompt(self, platform: Optional[str], user_system_prompt: Optional[str]) -> str:
        plat = build_platform_template(platform)
        usp = (user_system_prompt or "").strip()
        return (usp + "\n\n" + plat).strip() if usp else plat

    def _compose_user_prompt(self,
                             keywords: List[str],
                             image_urls: List[str],
                             previous_prompt: Optional[str]) -> str:
        parts = []
        if keywords:
            parts.append(f"- 고려 키워드: {', '.join(keywords)}")
        if image_urls:
            parts.append(f"- 참고 이미지 URL: {', '.join(image_urls)}")
        if previous_prompt:
            parts.append(f"- 직전 생성 시 참고 프롬프트(요약/원문): {previous_prompt}")
        parts.append("위 항목을 바탕으로 플랫폼 가이드와 충돌하지 않게 자연스러운 구매/방문 리뷰를 작성해주세요.")
        return "\n".join(parts)

    def _call_llm(self, system_prompt: str, user_prompt: str, char_limit: Optional[int]) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user",    "content": user_prompt},
        ]
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            temperature=0.7,
        )
        txt = resp.choices[0].message.content.strip()
        return clip(txt, char_limit)

    # -------- Public --------

    def generate(self, user_id: int, mission_id: int,
                 platform: Optional[str], keywords: List[str], image_urls: List[str],
                 user_system_prompt: Optional[str], char_limit: Optional[int],
                 previous_prompt: Optional[str]) -> Dict:
        system_prompt = self._compose_system_prompt(platform, user_system_prompt)
        user_prompt = self._compose_user_prompt(keywords, image_urls, previous_prompt)
        content = self._call_llm(system_prompt, user_prompt, char_limit)
        return {
            "content": content,
            "usedSystemPrompt": system_prompt,
            "usedUserPrompt": user_prompt,
            "model": OPENAI_MODEL,
            "meta": {
                "platform": platform,
                "keywords": keywords,
                "imageUrls": image_urls,
            }
        }

    def regenerate(self, user_id: int, mission_id: int,
                   platform: Optional[str], keywords: List[str], image_urls: List[str],
                   base_edited_text: Optional[str], custom_prompt: Optional[str],
                   user_system_prompt: Optional[str], char_limit: Optional[int],
                   previous_prompt: Optional[str]) -> Dict:
        system_prompt = self._compose_system_prompt(platform, user_system_prompt)

        # 우선순위: custom_prompt > base_edited_text > 일반 조합
        if custom_prompt:
            user_prompt = f"[재생성 요청 - 사용자 프롬프트 우선]\n{custom_prompt}\n\n참고 키워드: {', '.join(keywords)}"
        elif base_edited_text:
            user_prompt = (
                "[재생성 요청 - 사용자 편집본을 기반으로 품질 개선]\n"
                "아래 편집본의 톤/사실/문맥을 존중하되, 플랫폼 가이드에 맞춰 더 매끄럽게 다듬어주세요.\n\n"
                f"{base_edited_text}\n\n"
                f"(참고 키워드: {', '.join(keywords)})"
            )
        else:
            user_prompt = self._compose_user_prompt(keywords, image_urls, previous_prompt)

        content = self._call_llm(system_prompt, user_prompt, char_limit)
        return {
            "content": content,
            "usedSystemPrompt": system_prompt,
            "usedUserPrompt": user_prompt,
            "model": OPENAI_MODEL,
            "meta": {
                "platform": platform,
                "keywords": keywords,
                "imageUrls": image_urls,
                "mode": "CUSTOM_PROMPT" if custom_prompt else ("FROM_EDITED" if base_edited_text else "NORMAL")
            }
        }
