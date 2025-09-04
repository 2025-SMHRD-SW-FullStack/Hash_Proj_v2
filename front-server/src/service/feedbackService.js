import api from '../config/axiosInstance'

export const fetchSellerFeedbacks = async ({ page = 0, size = 50 } = {}) => {
  const res = await api.get('/api/seller/feedbacks', { params: { page, size } })
  return res.data
}

// 설문 템플릿(카테고리 기반) — 서버에 SurveyCatalog 있음
export const getSurveyTemplate = (productId) =>
  api.get(`/api/products/${productId}/survey-template`).then(r => r.data)

// 설문 제출(임시 저장 X, 바로 서버 보냄)
export const submitSurvey = (orderItemId, payload) =>
  api.post(`/api/surveys/answers`, { orderItemId, ...payload }).then(r => r.data)

// 셀러 피드백

// [셀러] 피드백 관리 그리드: 피드백 전용 API로 교체
export const fetchSellerFeedbackGrid = async ({ from, to, q, page = 0, size = 100 } = {}) => {
  // 백엔드는 페이지네이션만 사용 (from/to/q는 현재 미사용이므로 클라에서 쓰고 싶으면 필터링으로 처리)
  const { data } = await api.get('/api/seller/feedbacks', { params: { page, size } })

  // 서버가 Page 형태({content, totalElements...}) 또는 배열로 줄 수 있으니 모두 방어
  const list = Array.isArray(data) ? data : (data?.content ?? [])

  // 화면 컴포넌트(FeedbackRow / useFeedbackFilters)가 기대하는 키로 매핑
  const content = list.map(d => ({
    id: d.id,                                   // feedbackId
    orderUid: d.orderUid,                       // 주문번호: toOrderNo(row)에서 가장 먼저 읽음
    productName: d.productName,                 // 상품명
    buyerName: d.buyer,                         // 구매자 닉네임 (FeedbackRow는 buyerName/receiver/name 순으로 읽음)
    feedbackContent: d.feedbackContent,         // 피드백 내용
    createdAt: d.feedbackCreatedAt,             // 작성일: FeedbackRow는 writtenAt/feedbackAt/createdAt 순으로 읽음
    deliveredAt: d.deliveredAt,                 // 상태 계산용
    deadlineAt: d.deadlineAt,                   // 상태 계산용(배송완료+7일 00:00)
    reportStatus: d.reportStatus ?? null,       // 신고 상태(버튼/뱃지 제어)
  }))

  // 페이지 메타도 그대로 보존 (페이지네이션 확장 대비)
  return {
    content,
    totalElements: data?.totalElements ?? content.length,
    totalPages: data?.totalPages ?? 1,
    page: data?.page ?? page,
    size: data?.size ?? size,
  }
}

/** 피드백 신고(셀러) */
export const reportFeedback = async ({ feedbackId, reason }) => {
  const payload = { feedbackId, reason }
  const { data } = await api.post('/api/seller/feedbacks/report', payload)
  return data
}

// (옵션) 통계 API …
export const fetchFeedbackSummary = async ({ productId, from, to }) => {
  const params = {}
  if (productId) params.productId = productId
  if (from) params.from = from
  if (to) params.to = to
  const { data } = await api.get('/api/seller/feedbacks/summary', { params })
  return data
}
export const fetchFeedbackDemographics = async ({ productId, from, to }) => {
  const params = {}
  if (productId) params.productId = productId
  if (from) params.from = from
  if (to) params.to = to
  const { data } = await api.get('/api/seller/feedbacks/demographics', { params })
  return data
}
export const fetchFeedbackQuestionStats = async ({ productId, from, to }) => {
  const params = {}
  if (productId) params.productId = productId
  if (from) params.from = from
  if (to) params.to = to
  const { data } = await api.get('/api/seller/feedbacks/questions', { params })
  return data
}

// 피드백 통계
// 내부 헬퍼: 2xx만 데이터, 나머진 null
const getSafe = (url, params) =>
  api.get(url, { params, validateStatus: () => true })
    .then(r => (r.status >= 200 && r.status < 300 ? r.data : null))
    .catch(() => null)

/**
 * 피드백 통계(인구통계/요약/설문 문항별 평균) 묶어서 반환
 * @param {object} args
 * @param {number|string} args.productId  (필수)
 * @param {string} [args.category]        (questions API에 필요)
 * @param {string} [args.from]            'YYYY-MM-DD'
 * @param {string} [args.to]              'YYYY-MM-DD'
 *
 * 반환 shape:
 * {
 *   summary: {...} | null,
 *   stars: {...},
 *   demographics: [...],
 *   aiDaily: [{ date, headline, keyPointsJson, actionsJson, fullSummary, model, createdAt }],
 *   lastGeneratedAt: string | null
 * }
 */
export async function fetchFeedbackStats({ productId, from, to }) {
  const paramsCommon = { productId, from, to }

  const [demo, qs, sum, tpl, ai] = await Promise.all([
    getSafe('/api/seller/feedbacks/demographics', paramsCommon),
    getSafe('/api/seller/feedbacks/questions', paramsCommon),
    getSafe('/api/seller/feedbacks/summary', paramsCommon),
    getSafe(`/api/products/${productId}/survey-template`), // 옵션 코드→라벨 매핑
    getSafe('/api/seller/ai/daily', { productId, limit: 14 }), // ✅ 전날 AI 요약 목록
  ])
  const aiDays = Array.isArray(ai?.days) ? ai.days : []
  const lastGeneratedAt = ai?.lastGeneratedAt || (aiDays[0]?.createdAt ?? null)

  // ── 불리언 문항 판별 & 버킷 → 퍼센트(소수1자리) 정규화
  const isBinary = (q) => {
    const t = String(q?.type || '').toUpperCase()
    if (t.includes('BOOL') || t.includes('YES_NO')) return true
    const ks = Object.keys(q?.buckets || {}).map(k => k.toLowerCase())
    return ks.length === 2 && ks.every(k => ['true', 'false', 'yes', 'no', 'y', 'n', '있음', '없음'].includes(k))
  }
  const normBuckets = (b) => {
    const entries = Object.entries(b || {}).map(([key, count]) => ({ key: String(key), count: Number(count || 0) }))
    const total = entries.reduce((s, e) => s + e.count, 0) || 1
    return entries.map(e => ({ ...e, ratio: Math.round((e.count / total) * 1000) / 10 })) // x.y%
  }

  // ── 문항 가공: 척도형 평균 / 불리언 비율 분리
  // 설문 템플릿 옵션 라벨 맵 (choice용)
  const optionLabelMap = {}
  for (const q of (tpl?.questions ?? [])) {
    if (q?.code && Array.isArray(q?.options)) {
      optionLabelMap[q.code] = {}
      for (const o of q.options) {
        optionLabelMap[q.code][String(o.value).toUpperCase()] = o.label
      }
      optionLabelMap[q.code]['NA'] ??= '무응답'
    }
  }

  const byQuestionAvg = []      // 척도형 평균용
  const byQuestionChoice = []   // 도넛용(예/아니오/무응답 등 전체)
  const toPercent = (c, t) => (t > 0 ? Math.round((c / t) * 1000) / 10 : 0)
  const toYNLabel = (val) => {
    if (/^(TRUE|YES|Y|있음|긍정|만족)$/i.test(val)) return '예'
    if (/^(FALSE|NO|N|없음|부정|불만족)$/i.test(val)) return '아니오'
    return null
  }
  for (const q of (qs?.questions ?? [])) {
    const type = String(q?.type || '').toUpperCase()
    const code = q?.code
    if (type.startsWith('SCALE')) {
      byQuestionAvg.push({ label: q?.label ?? '', avg: Number(q?.average ?? 0) })
      continue
    }
    // CHOICE 계열: 모든 버킷(예/아니오/미정/NA 등)을 퍼센트로 변환
    const entries = Object.entries(q?.buckets || {}).map(([k, v]) => ({
      value: String(k).toUpperCase(), count: Number(v || 0),
    }))
    const total = entries.reduce((s, e) => s + e.count, 0)
    const map = optionLabelMap[code] || {}
    const slices = entries
      .map(e => {
        const yn = toYNLabel(e.value)
        const label = yn ?? map[e.value] ?? (e.value === 'NA' ? (map['NA'] || '무응답') : e.value)
        return { label, ratio: toPercent(e.count, total) }
      })
      .sort((a, b) => b.ratio - a.ratio)
    byQuestionChoice.push({ label: q?.label ?? '', slices })
  }

  // ── demographics → 도넛 데이터 [{ name, value, avg }]
  const demographics = (demo?.byAgeRange ?? []).map(a => ({
    name: a?.key ?? '',                         // 라벨 (예: '20대')
    value: Number(a?.count ?? 0),               // 분포 카운트
    avg: typeof a?.averageOverallScore === 'number'
      ? a.averageOverallScore
      : null,
  }))

  // ── summary.ratingCounts → 별점 분포 [{ score, count }]
  const toNum = (v) => (v == null ? 0 : Number(v)) || 0

  const distribution = (() => {
    const rc = sum?.ratingCounts || sum?.ratings || sum?.counts
    if (!rc || typeof rc !== 'object') return []
    return Object.entries(rc)
      .map(([k, v]) => ({ score: Number(k), count: toNum(v) }))
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
  })()
  const distributionTotal = distribution.reduce((s, d) => s + d.count, 0)

  const normalizedTotal =
    toNum(sum?.totalCount) ||
    toNum(sum?.total) ||
    toNum(sum?.count) ||
    toNum(sum?.reviewCount) ||
    toNum(sum?.reviewsCount) ||
    toNum(sum?.ratingsCount) ||
    distributionTotal

  return {
    summary: sum
      ? {
        totalCount: normalizedTotal,
        averageOverallScore:
          typeof sum.averageOverallScore === 'number'
            ? sum.averageOverallScore
            : toNum(sum.avg) || toNum(sum.average) || 0,
        from: sum.from,
        to: sum.to,
      }
      : null,
    stars: {
      overallAvg:
        typeof sum?.averageOverallScore === 'number'
          ? sum.averageOverallScore
          : null,
      distribution,
      totalCount: normalizedTotal,
      byQuestionAvg,
      byQuestionChoice,
    },
    demographics,
    aiDaily: aiDays,           // ✅ AI 요약 목록
    lastGeneratedAt,           // ✅ 마지막 생성 시각
  }
}

/** (선택) 설문 템플릿: 카테고리/문항 라벨 필요 시 사용 */
export async function fetchSurveyTemplate(productId) {
  return getSafe(`/api/products/${productId}/survey-template`)
}

/** 피드백 신고 */
export const ReportFeedback = async ({ feedbackId, reason }) => {
  if (!feedbackId) throw new Error('feedbackId가 필요합니다.')
  const body = { reason }

  // 레포별 엔드포인트 차이 방어(우선순위)
  const candidates = [
    `/api/seller/feedbacks/${feedbackId}/report`,
    `/api/feedbacks/${feedbackId}/report`,
    `/api/admin/feedbacks/${feedbackId}/report`,
  ]

  let lastErr
  for (const url of candidates) {
    try {
      const { data } = await api.post(url, body)
      return data
    } catch (e) {
      lastErr = e
      const st = e?.response?.status
      if (st !== 404 && st !== 405) throw e
    }
  }
  throw lastErr
}

export const submitFeedback = (payload) =>
  api.post(`/api/feedbacks`, payload).then(r => r.data)

/**
 * 현재 로그인된 사용자가 작성한 모든 피드백 목록을 가져옵니다.
 * @returns {Promise<Array>} 피드백 목록
 */
export const getMyFeedbacks = () =>
  api.get('/api/feedbacks/me').then(r => r.data) // '/api/me/feedbacks' -> '/api/feedbacks/me'로 수정

/**
 * 특정 피드백의 상세 정보를 ID로 조회합니다.
 * @param {number | string} feedbackId 피드백 ID
 * @returns {Promise<object>} 피드백 상세 정보
 */
export const getFeedbackDetail = (feedbackId) =>
  api.get(`/api/feedbacks/${feedbackId}`).then(r => r.data)

/**
 * (신규) 특정 상품에 대한 피드백 목록을 페이지네이션으로 가져옵니다.
 * @param {number | string} productId 상품 ID
 * @param {object} params - { page, size }
 * @returns {Promise<object>} 페이지네이션된 피드백 데이터
 */
export const getProductFeedbacks = (productId, { page = 0, size = 5 } = {}) =>
  api.get(`/api/feedbacks/products/${productId}`, { params: { page, size } }).then(r => r.data)

/**
 * (신규) 관리자가 피드백을 삭제합니다.
 */
export const adminDeleteFeedback = (feedbackId) =>
  api.delete(`/api/admin/feedbacks/${feedbackId}`)

// 피드백 통계
// 모듈 캐시: 페이지 내에서 여러 번 호출해도 네트워크는 1회
let _myProductsCache = null

// 전체 내 상품 목록
export async function listMyProducts() {
  if (_myProductsCache) return _myProductsCache
  const res = await api.get('/api/seller/products', { validateStatus: () => true })
  if (res.status < 200 || res.status >= 300) {
    console.error('[feedbackService] /api/seller/products ->', res.status, res.data)
    _myProductsCache = []
    return _myProductsCache
  }
  const raw = res.data
  const arr = Array.isArray(raw) ? raw : (raw?.content ?? raw?.items ?? raw?.list ?? [])
  _myProductsCache = (Array.isArray(arr) ? arr : []).map(p => ({
    id: p?.id ?? p?.productId ?? null,
    name: p?.name ?? p?.productName ?? '(이름 없음)',
    category: p?.category ?? '',
  })).filter(x => x.id != null)
  return _myProductsCache
}

const CATEGORY_ALIAS = {
  '무형자산(플랫폼)': '무형자산',
}
const toCanonicalCategory = (c) =>
  CATEGORY_ALIAS[c] ?? String(c || '').replace(/\(.*?\)/g, '').trim()

// ✅ 카테고리별 목록(클라이언트 필터)
export async function fetchProductsByCategory(category) {
  const all = await listMyProducts()
  const key = toCanonicalCategory(category)
  if (!key) return all
  const norm = v => toCanonicalCategory(v).toLowerCase()
  return all.filter(p => norm(p.category) === norm(key))
}
