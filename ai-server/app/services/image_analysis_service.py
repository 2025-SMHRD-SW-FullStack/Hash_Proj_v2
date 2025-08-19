from __future__ import annotations
from typing import List, Dict, Any, Tuple
from PIL import Image
from collections import Counter
from urllib.parse import urlparse
import io, os, re

def _load_image(src: str) -> Image.Image:
    if src.startswith("http://") or src.startswith("https://"):
        import requests
        r = requests.get(src, timeout=6)
        r.raise_for_status()
        return Image.open(io.BytesIO(r.content)).convert("RGB")
    return Image.open(src).convert("RGB")

class ImageAnalysisService:
    """
    이미지 분석 (AUTO 폴백):
    1) 텍스트 풍부 → OCR로 스펙/키워드 추출
    2) 텍스트 희박(제품 실사) → CLIP 태깅/BLIP 캡션(토글)로 '내용' 추출
    3) 힌트/태그를 LLM 포인트에 주입
    """

    _clip_ready = False
    _blip_ready = False
    _clip = None
    _clip_preprocess = None
    _clip_tokenizer = None
    _blip_pipe = None

    def __init__(self):
        # 기본 파라미터
        self.max_images = int(os.getenv("IMG_ANALYSIS_MAX", "3"))
        self.ocr_lang = os.getenv("OCR_LANG", "kor+eng")
        self.mode = os.getenv("IMG_ANALYSIS_MODE", "auto")  # auto | ocr_only | off
        self.min_words = int(os.getenv("TEXT_OCR_MIN_WORDS", "5"))
        self.min_conf = int(os.getenv("TEXT_OCR_MIN_CONF", "45"))

        # CLIP/BLIP 토글
        self.enable_clip = os.getenv("IMG_ANALYSIS_CLIP", "0") == "1"
        self.enable_blip = os.getenv("IMG_ANALYSIS_BLIP", "0") == "1"

        # 모델 설정
        self.clip_model_name = os.getenv("CLIP_MODEL", "ViT-B-32")
        self.clip_pretrain = os.getenv("CLIP_PRETRAIN", "laion2b_s34b_b79k")
        self.blip_model_name = os.getenv("BLIP_MODEL", "Salesforce/blip-image-captioning-base")

        # 라벨 후보(영/한 혼용 가능; 필요시 ENV로 교체)
        self.clip_labels = [
            "watch", "stainless steel", "leather strap", "metal bracelet",
            "bottle", "package", "box", "unboxing",
            "cosmetics", "skincare", "food", "beverage",
            "logo", "label", "instruction", "manual", "nutrition facts",
        ]

        # lazy init (첫 호출 때 로드)
        # -> analyze()에서 필요할 때만 _setup_clip/_setup_blip 호출

    # -------- public --------
    def analyze(self, sources: List[str], payload: Dict | None = None) -> Dict[str, Any]:
        if not sources or self.mode == "off":
            return {"hints": [], "ocr": "", "tags": []}

        total = min(len(sources), self.max_images)
        texts: List[str] = []
        text_rich_idx = set()
        photo_idx = set()
        ocr_stats = []

        # 1) OCR 측정
        for i, src in enumerate(sources[: self.max_images]):
            img = self._safe_load(src)
            if img is None:
                continue

            if self.mode == "ocr_only":
                txt, words, conf = self._ocr_text_and_stats(img)
                ocr_stats.append((i, words, conf))
                if txt: texts.append(txt)
            else:
                txt, words, conf = self._ocr_text_and_stats(img)
                ocr_stats.append((i, words, conf))
                if words >= self.min_words and conf >= self.min_conf:
                    texts.append(txt)
                    text_rich_idx.add(i)
                else:
                    photo_idx.add(i)

        full_text = "\n".join(texts)
        specs = self._extract_specs(full_text) if full_text else []
        tokens, _ = self._extract_top_tokens(full_text) if full_text else ([], Counter())

        # 2) 텍스트 희박한 사진에 대해 CLIP/BLIP 수행(토글)
        clip_tags_all: List[str] = []
        blip_caps_all: List[str] = []

        if self.mode != "ocr_only" and len(photo_idx) > 0:
            if self.enable_clip:
                self._setup_clip()
                if self._clip_ready:
                    for i in sorted(photo_idx):
                        img = self._safe_load(sources[i])
                        if img is None: continue
                        clip_tags_all += self._clip_tags(img, topk=3)
            if self.enable_blip:
                self._setup_blip()
                if self._blip_ready:
                    for i in sorted(photo_idx):
                        img = self._safe_load(sources[i])
                        if img is None: continue
                        cap = self._blip_caption(img, max_new_tokens=25)
                        if cap: blip_caps_all.append(cap)

        # 3) 힌트 조립
        hints: List[str] = []
        head = f"첨부 사진 {total}장 기반 디테일 강조"
        if self.mode != "ocr_only":
            head += f" (텍스트감지 {len(text_rich_idx)}장, 실사 {len(photo_idx)}장)"
        hints.append(head)

        for s in specs[:5]:
            hints.append(f"사진 단서: {s}")
        for t in tokens[:5]:
            hints.append(f"사진 단서: {t}")

        # CLIP/BLIP 결과를 LLM 힌트로 요약
        for tag in self._dedupe(clip_tags_all)[:5]:
            hints.append(f"사진 태그: {tag}")
        for cap in blip_caps_all[:3]:
            hints.append(f"사진 설명: {cap}")

        if len(photo_idx) > 0:
            hints.append("실사 사진 중심: 패키지/구성/사용샷/디테일 묘사")

        hints = self._dedupe(hints)
        tags = self._dedupe(specs[:10] + tokens[:10] + clip_tags_all[:10])

        return {
            "hints": hints[:10],
            "ocr": full_text[:2000],
            "tags": tags[:20]
        }

    # -------- internal: OCR --------
    def _safe_load(self, src: str):
        try:
            return _load_image(src)
        except Exception:
            return None

    def _ocr_text_and_stats(self, image: Image.Image) -> Tuple[str, int, int]:
        try:
            import pytesseract
            from pytesseract import Output
            data = pytesseract.image_to_data(image, lang=self.ocr_lang, output_type=Output.DICT)
            words = [w.strip() for w in data.get("text", []) if w and w.strip()]
            confs = [int(c) for c in data.get("conf", []) if c not in ("-1", "", None)]
            avg_conf = int(sum(confs) / len(confs)) if confs else 0
            text = " ".join(words)
            return text, len(words), avg_conf
        except Exception:
            return "", 0, 0

    # -------- internal: CLIP --------
    def _setup_clip(self):
        if self._clip_ready or not self.enable_clip:
            return
        try:
            import open_clip, torch
            self._torch = torch
            self._open_clip = open_clip
            self._clip_model, _, self._clip_preprocess = open_clip.create_model_and_transforms(
                self.clip_model_name, pretrained=self.clip_pretrain
            )
            self._clip_tokenizer = open_clip.get_tokenizer(self.clip_model_name)
            self._clip_model.eval()
            self._clip_ready = True
        except Exception:
            self._clip_ready = False

    def _clip_tags(self, image: Image.Image, topk: int = 3) -> List[str]:
        if not self._clip_ready:
            return []
        try:
            import torch
            img = self._clip_preprocess(image).unsqueeze(0)
            with torch.no_grad():
                text = self._clip_tokenizer(self.clip_labels)
                text_features = self._clip_model.encode_text(text)
                image_features = self._clip_model.encode_image(img)
                text_features /= text_features.norm(dim=-1, keepdim=True)
                image_features /= image_features.norm(dim=-1, keepdim=True)
                logits = (image_features @ text_features.T).squeeze(0)
                topk_idx = logits.topk(min(topk, len(self.clip_labels))).indices.tolist()
                return [self.clip_labels[i] for i in topk_idx]
        except Exception:
            return []

    # -------- internal: BLIP --------
    def _setup_blip(self):
        if self._blip_ready or not self.enable_blip:
            return
        try:
            from transformers import AutoProcessor, AutoModelForCausalLM, pipeline
            # 이미지→텍스트 파이프라인(캡션)
            self._blip_pipe = pipeline(
                "image-to-text",
                model=self.blip_model_name,
                max_new_tokens=32
            )
            self._blip_ready = True
        except Exception:
            self._blip_ready = False

    def _blip_caption(self, image: Image.Image, max_new_tokens: int = 25) -> str:
        if not self._blip_ready:
            return ""
        try:
            outs = self._blip_pipe(image, max_new_tokens=max_new_tokens)
            if isinstance(outs, list) and outs and "generated_text" in outs[0]:
                return outs[0]["generated_text"].strip()
            return ""
        except Exception:
            return ""

    # -------- common utils --------
    def _extract_specs(self, text: str) -> List[str]:
        patt = [
            r"\b\d{1,2}\s?atm\b",
            r"\b\d{2,3}\s?m\b",
            r"\b\d{1,3}\s?mm\b",
            r"\b\d{2,4}\s?mah\b",
            r"\b\d{1,4}\s?(?:g|kg)\b",
            r"\b\d{1,2}(?:\.\d)?\s?(?:inch|in)\b",
            r"\b(?:stainless|sapphire|waterproof|quartz|automatic|luminous)\b",
        ]
        low = text.lower()
        found: List[str] = []
        for p in patt:
            found += re.findall(p, low)
        return self._dedupe(found)

    def _extract_top_tokens(self, text: str, topk: int = 20) -> Tuple[List[str], Counter]:
        if not text:
            return [], Counter()
        words = re.findall(r"[가-힣]{2,8}|[A-Za-z]{2,15}", text)
        stop_ko = {"제품","사진","리뷰","구매","사용","상태","정말","너무","그리고","해서","하는","합니다","했습니다","있어요","있습니다"}
        stop_en = {"the","this","that","with","for","and","from","you","your","very","good","nice","great","is","are","was","were"}
        normed = [w.lower() for w in words if (w.lower() not in stop_en and w not in stop_ko)]
        cnt = Counter(normed)
        items = [w for w, c in cnt.most_common() if c >= 2][:topk]
        return items, cnt

    def _dedupe(self, seq: List[str]) -> List[str]:
        s, out = set(), []
        for x in seq:
            if x not in s:
                out.append(x); s.add(x)
        return out
