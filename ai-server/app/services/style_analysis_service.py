from typing import List, Dict
from collections import Counter

class StyleAnalysisService:
    def analyze(self, texts: List[str]) -> Dict:
        if not texts:
            return {
                "toneLabel": "중립",
                "styleTags": ["간결함","사실기반"],
                "systemPrompt": "과장 없이 사실 위주로 자연스럽게 작성하세요.",
                "consumedSamples": 0
            }
        avg_len = sum(len(t) for t in texts) / len(texts)
        tone_label = "담백" if avg_len < 80 else ("균형" if avg_len < 200 else "상세")
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

    def analyze_entries(self, entries: List[Dict]) -> Dict:
        if not entries:
            return self.analyze([])
        total_w = 0.0
        weighted_sum = 0.0
        tag_counter = Counter()
        for e in entries:
            t = e.get("text") or ""
            w = float(e.get("weight") or 1.0)
            weighted_sum += len(t) * w
            total_w += w
            for tag in (e.get("tags") or []):
                tag_counter[tag] += w
        avg_len = (weighted_sum / total_w) if total_w > 0 else 0.0
        tone_label = "담백" if avg_len < 80 else ("균형" if avg_len < 200 else "상세")
        extra_tags = [t for (t, _) in tag_counter.most_common(5)]
        base_tags = ["자연스러움","간결함","사실기반"]
        style_tags = list(dict.fromkeys(base_tags + extra_tags))
        system_prompt = (
            "다음 지침을 따르세요:\n"
            "- 문장을 자연스럽고 간결하게.\n"
            "- 과장된 표현/형용사는 절제.\n"
            "- 사실 기반으로, 체험 포인트는 구체적으로.\n"
        )
        return {
            "toneLabel": tone_label,
            "styleTags": style_tags,
            "systemPrompt": system_prompt,
            "consumedSamples": len(entries)
        }
        