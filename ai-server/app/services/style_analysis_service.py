from typing import List, Dict
import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

STYLE_SYS = """당신은 사용자의 기존 글에서 말투/스타일을 추출하는 분석가입니다.
- 문체, 어휘, 문장 길이, 감성 정도, 이모지 사용 등을 요약합니다.
- 결과는 프롬프트로 재사용 가능해야 합니다.
"""

STYLE_USER_TMPL = """아래 텍스트 샘플을 분석해 사용자 맞춤 스타일을 요약하세요.
텍스트 샘플(최대 5개 예시):
{samples}

출력 형식:
- toneLabel: 한 줄 라벨
- styleTags: 3~6개 키워드
- systemPrompt: LLM 시스템 프롬프트로 재사용 가능한 지시문(5~10줄)
"""

def _build_samples(texts: List[str]) -> str:
    cut = texts[:5] if texts else []
    numbered = [f"{i+1}. {t[:800]}" for i, t in enumerate(cut)]
    return "\n".join(numbered) if numbered else "(샘플 없음)"

class StyleAnalysisService:
    def analyze(self, user_id: int, texts: List[str], image_urls: List[str]) -> Dict:
        # TODO: image_urls -> OCR 텍스트 추가(원하면 여기에서 구현)
        samples_block = _build_samples(texts)
        user_prompt = STYLE_USER_TMPL.format(samples=samples_block)

        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": STYLE_SYS},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4
        )
        txt = resp.choices[0].message.content.strip()

        # 간단 파싱(실서비스에선 JSON 포맷 강제 권장)
        # 여기서는 가벼운 기본값만 보장
        tone_label = "사용자 맞춤 톤"
        system_prompt = (
            "다음 지침을 따르세요:\n"
            "- 문장을 자연스럽고 간결하게.\n"
            "- 과장된 표현/형용사는 절제.\n"
            "- 사실 기반으로, 체험 포인트는 구체적으로.\n"
        )
        style_tags = ["자연스러움","간결함","사실기반"]

        return {
            "toneLabel": tone_label,
            "styleTags": style_tags,
            "systemPrompt": system_prompt,
            "consumedSamples": len(texts)
        }
