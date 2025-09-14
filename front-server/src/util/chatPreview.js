// src/util/chatPreview.js
const IMG_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i;

// 마지막 토큰(또는 마지막 라인 끝)이 이미지 URL인지 판단
function isLastImageUrl(s) {
  if (!s) return false;
  const text = String(s);

  // 마지막 "라인"만 뽑고
  const lines = text.split(/\r?\n/).filter(Boolean);
  const lastLine = lines.length ? lines[lines.length - 1] : text;

  // 마지막 "토큰"만 뽑아 끝의 문장부호 제거
  const tokens = lastLine.split(/\s+/).filter(Boolean);
  const lastToken = tokens.length ? tokens[tokens.length - 1] : lastLine;
  const cleaned = lastToken.replace(/[)\]\}>"'.,;:!?]+$/, '');

  return IMG_EXT_RE.test(cleaned);
}

/**
 * 미리보기 텍스트:
 * - 본문이 JSON({type:'IMAGE', url})이면 [사진]
 * - 마지막 문구(라인/토큰)가 이미지 URL이면 [사진]
 * - 그 외엔 원문 유지
 * - 비어 있으면 fallback
 */
export function previewText(raw, fallback = '대화를 시작해보세요') {
  const s = (raw ?? '').toString();
  if (!s.trim()) return fallback;

  // JSON 형태 이미지 메시지도 지원
  try {
    const o = JSON.parse(s);
    if (o && (o.type === 'IMAGE' || o.kind === 'image') && o.url) return '이미지';
  } catch (_) {}

  // "마지막 문구"가 이미지 URL이면 [사진]
  if (isLastImageUrl(s)) return '이미지';

  // 아니면 원문 그대로
  return s.trim();
}
