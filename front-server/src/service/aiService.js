// /src/service/aiService.js
import axiosAI from "../config/axiosAI"

// 날짜 포맷 유틸
const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/**
 * 실시간 요약 생성
 */
export async function computeAiSummaryNow({ stats, meta }) {
  if (!stats) throw new Error('stats가 필요합니다.')
  const today = ymd(new Date())
  const stars = stats?.stars || {}
  const demoArr = stats?.demographics || []

  const buyerSample =
    Number(stats?.summary?.totalCount ?? 0) ||
    (Array.isArray(stars.distribution)
      ? stars.distribution.reduce((s, d) => s + (Number(d?.count) || 0), 0)
      : 0)

  const starsMap = {}
  for (const d of stars.distribution || []) {
    if (d?.score != null) starsMap[String(d.score)] = Number(d?.count || 0)
  }

  const demographicsMap = {}
  for (const a of demoArr) {
    if (a?.name) demographicsMap[String(a.name)] = Number(a?.value || 0)
  }

  const byQuestionAvg = (stars.byQuestionAvg || []).map((q) => ({
    label: q?.label ?? '',
    average: Number(q?.avg ?? q?.average ?? 0),
  }))

  const byQuestionChoice = (stars.byQuestionChoice || []).map((q) => {
    const buckets = {}
    for (const s of q?.slices || []) {
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
    feedbackTexts: [],
    previousSummary: stats?.aiDaily?.[0]?.fullSummary ?? null,
  }

  const { data } = await axiosAI.post('/api/ai/summary/daily', payload)
  return {
    date: today,
    headline: data?.headline ?? '',
    keyPointsJson: JSON.stringify(data?.keyPoints || []),
    actionsJson: JSON.stringify(data?.actions || []),
    fullSummary: data?.fullSummary ?? '',
    model: data?.model ?? 'gpt-4.1',
    createdAt: new Date().toISOString(),
    __live: true,
  }
}

/* ========= 챗봇 엔드포인트 ========= */

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

// AI 게시 (이미지 URL 배열을 함께 전달)
export async function acceptNow(userId, images = undefined) {
  const payload = { user_id: Number(userId) }
  if (Array.isArray(images)) payload.images = images
  const { data } = await axiosAI.post('/api/ai/chat/accept', payload)
  return data
}

export async function editSummary(userId, instructions) {
  const { data } = await axiosAI.post('/api/ai/chat/edit', {
    user_id: Number(userId),
    instructions,
  })
  return data
}
