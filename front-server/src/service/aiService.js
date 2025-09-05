// /src/service/aiService.js
import axiosAI from "../config/axiosAI"

// 날짜 포맷 유틸
const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/**
 * 실시간 요약 생성
 * - stats: fetchFeedbackStats() 결과 그대로 넘겨주면 내부에서 변환
 * - meta : { productId, productName, category }
 */
export async function computeAiSummaryNow({ stats, meta }) {
  if (!stats) throw new Error('stats가 필요합니다.')
  const today = ymd(new Date())
  const stars = stats?.stars || {}
  const demoArr = stats?.demographics || []

  // 표본 수
  const buyerSample =
    Number(stats?.summary?.totalCount ?? 0) ||
    (Array.isArray(stars.distribution)
      ? stars.distribution.reduce((s, d) => s + (Number(d?.count) || 0), 0)
      : 0)

  // 별점 분포 → { "1": n, "2": n, ... }
  const starsMap = {}
  for (const d of stars.distribution || []) {
    if (d?.score != null) starsMap[String(d.score)] = Number(d?.count || 0)
  }

  // 인구통계 → { "20대": n, ... }
  const demographicsMap = {}
  for (const a of demoArr) {
    if (a?.name) demographicsMap[String(a.name)] = Number(a?.value || 0)
  }

  // 문항 평균 [{label, average}]
  const byQuestionAvg = (stars.byQuestionAvg || []).map((q) => ({
    label: q?.label ?? '',
    average: Number(q?.avg ?? q?.average ?? 0),
  }))

  // 선택형 [{label, buckets:{opt: pct,...}}]
  const byQuestionChoice = (stars.byQuestionChoice || []).map((q) => {
    const buckets = {}
    for (const s of q?.slices || []) {
      // ratio(%) 그대로 사용
      buckets[String(s.label ?? '')] = Number(s.ratio ?? 0)
    }
    return { label: q?.label ?? '', buckets }
  })

  const payload = {
    date: today,
    productId: meta?.productId,
    productName: meta?.productName ?? '',
    category: meta?.category ?? '',
    overallAvg: typeof stars?.overallAvg === 'number' ? stars.overallAvg : null,
    stars: starsMap,
    demographics: demographicsMap,
    buyerSample,
    byQuestionAvg,
    byQuestionChoice,
    feedbackTexts: [], // 필요 시 최근 텍스트들 넣기
    previousSummary: stats?.aiDaily?.[0]?.fullSummary ?? null,
  }

  const { data } = await axiosAI.post('/api/ai/summary/daily', payload)
  // data = {headline,keyPoints,actions,fullSummary,model,...}
  return {
    date: today,
    headline: data?.headline ?? '',
    keyPointsJson: JSON.stringify(data?.keyPoints || []),
    actionsJson: JSON.stringify(data?.actions || []),
    fullSummary: data?.fullSummary ?? '',
    model: data?.model ?? 'gpt-4.1',
    createdAt: new Date().toISOString(),
    __live: true, // 표시용 플래그
  }
}

/* ========= 챗봇 엔드포인트들: axiosAI로 통일 ========= */

export async function startSession(userId, orderItemId, productId) {
  const { data } = await axiosAI.post('/api/ai/chat/session', {
    user_id: Number(userId),
    order_item_id: Number(orderItemId),
    product_id: productId != null ? Number(productId) : null,
  })
  return data
}

export async function sendReply(userId, text) {
  const { data } = await axiosAI.post('/api/ai/chat/reply', {
    user_id: Number(userId),
    text,
  })
  return data
}

// 수동 게시
export async function acceptNow(userId) {
  const { data } = await axiosAI.post('/api/ai/chat/accept', {
    user_id: Number(userId),
  })
  return data
}

export async function editSummary(userId, instructions) {
  const { data } = await axiosAI.post('/api/ai/chat/edit', {
    user_id: Number(userId),
    instructions,
  })
  return data
}
