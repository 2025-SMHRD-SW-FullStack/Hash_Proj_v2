// /src/service/aiService.js
import axiosAI from "../config/axiosAI"

const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

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

/** ========= 챗봇 ========= **/

/**
 * 세션 시작
 * @param {number} userId
 * @param {number} orderItemId
 * @param {number|null} productId
 * @param {{overallScore?: number, answers?: object}} [preSurvey]
 */
export async function startSession(userId, orderItemId, productId, preSurvey) {
  const body = {
    user_id: Number(userId),
    order_item_id: Number(orderItemId),
    product_id: productId != null ? Number(productId) : null,
  }
  if (preSurvey && preSurvey.overallScore != null) {
    body.overall_score = Number(preSurvey.overallScore)
  }
  if (preSurvey && preSurvey.answers) {
    body.survey_answers = preSurvey.answers
  }
  const { data } = await axiosAI.post('/api/ai/chat/session', body)
  return data
}

/**
 * 사용자 발화
 */
export async function sendReply(userId, text) {
  const { data } = await axiosAI.post('/api/ai/chat/reply', {
    user_id: Number(userId),
    text,
  })
  return data
}

/**
 * 게시(이미지 + 선택적으로 preSurvey도 함께 넘길 수 있게)
 * @param {number} userId
 * @param {string[]|undefined} images
 * @param {{overallScore?:number, answers?:object}|undefined} preSurvey
 */
export async function acceptNow(userId, images = undefined, preSurvey = undefined) {
  const payload = { user_id: Number(userId) }
  if (Array.isArray(images)) payload.images = images
  if (preSurvey && preSurvey.answers) payload.survey_answers = preSurvey.answers
  if (preSurvey && preSurvey.overallScore != null) payload.overall_score = Number(preSurvey.overallScore)
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
