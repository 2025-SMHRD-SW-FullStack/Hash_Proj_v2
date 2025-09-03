// src/service/feedbackService.js
import api from '../config/axiosInstance'


export const fetchSellerFeedbacks = async ({ page = 0, size = 50 } = {}) => {
    const res = await api.get('/api/seller/feedbacks', { params: { page, size } })
    return res.data
}


// 설문 템플릿(카테고리 기반) — 서버에 SurveyCatalog 있음
export const getSurveyTemplate = (productId) =>
  api.get(`/api/products/${productId}/survey-template`).then(r => r.data);

// 설문 제출(임시 저장 X, 바로 서버 보냄)
export const submitSurvey = (orderItemId, payload) =>
  api.post(`/api/surveys/answers`, { orderItemId, ...payload }).then(r => r.data);




// 셀러 피드백

/** 셀러 피드백 그리드 (주문 그리드 기반)
 *  - 빈 값(from/to/q)은 쿼리스트링에 포함하지 않음 → Spring LocalDate 바인딩 에러 방지
 */
export const fetchSellerFeedbackGrid = async ({ from, to, q, page = 0, size = 100 } = {}) => {
  const params = { page, size }
  if (from) params.from = from          // 'YYYY-MM-DD'
  if (to) params.to = to                // 'YYYY-MM-DD'
  if (q && q.trim()) params.q = q.trim()

  const { data } = await api.get('/api/seller/orders/grid', { params })
  return data
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
 *   summary: {
 *     totalCount, averageOverallScore, from, to
 *   } | null,
 *   stars: {
 *     overallAvg,                 // 숫자 | null
 *     distribution: [{score, count}],  // 1~5 분포
 *     byQuestion:  [{label, avg}],     // 문항별 평균
 *   },
 *   demographics: [{ name, value, avg }] // 연령대 분포(도넛용)
 * }
 */
export async function fetchFeedbackStats({ productId, category, from, to }) {
  const paramsCommon = { productId, from, to }

  const [demo, qs, sum] = await Promise.all([
    getSafe('/api/seller/feedbacks/demographics', paramsCommon),
    getSafe('/api/seller/feedbacks/questions', { ...paramsCommon, category }),
    getSafe('/api/seller/feedbacks/summary', paramsCommon),
  ])

  // ── demographics → 도넛 데이터 [{ name, value, avg }]
  const demographics = (demo?.byAgeRange ?? []).map(a => ({
    name: a?.key ?? '',                         // 라벨 (예: '20대')
    value: Number(a?.count ?? 0),               // 분포 카운트
    avg: typeof a?.averageOverallScore === 'number'
      ? a.averageOverallScore
      : null,
  }))

  // ── summary.ratingCounts → 별점 분포 [{ score, count }]
  const distribution = (() => {
    const rc = sum?.ratingCounts
    if (!rc || typeof rc !== 'object') return []
    return Object.entries(rc)
      .map(([k, v]) => ({ score: Number(k), count: Number(v ?? 0) }))
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
  })()

  // ── questions.questions → 문항 평균 [{ label, avg }]
  const byQuestion = (qs?.questions ?? []).map(q => ({
    label: q?.label ?? '',
    avg: Number(q?.average ?? 0),
  }))

  return {
    summary: sum
      ? {
          totalCount: Number(sum.totalCount ?? 0),
          averageOverallScore: Number(sum.averageOverallScore ?? 0),
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
      byQuestion,
    },
    demographics,
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
      return data // { id, reportStatus: 'PENDING', ... } 등을 기대
    } catch (e) {
      lastErr = e
      const st = e?.response?.status
      if (st !== 404 && st !== 405) throw e
    }
  }
  throw lastErr
}
export const submitFeedback = (payload) =>
  api.post(`/api/feedbacks`, payload).then(r => r.data);

/**
 * 현재 로그인된 사용자가 작성한 모든 피드백 목록을 가져옵니다.
 * @returns {Promise<Array>} 피드백 목록
 */
export const getMyFeedbacks = () => 
  api.get('/api/feedbacks/me').then(r => r.data); // '/api/me/feedbacks' -> '/api/feedbacks/me'로 수정

/**
 * 특정 피드백의 상세 정보를 ID로 조회합니다.
 * @param {number | string} feedbackId 피드백 ID
 * @returns {Promise<object>} 피드백 상세 정보
 */
export const getFeedbackDetail = (feedbackId) =>
  api.get(`/api/feedbacks/${feedbackId}`).then(r => r.data);

/**
 * (신규) 특정 상품에 대한 피드백 목록을 페이지네이션으로 가져옵니다.
 * @param {number | string} productId 상품 ID
 * @param {object} params - { page, size }
 * @returns {Promise<object>} 페이지네이션된 피드백 데이터
 */
export const getProductFeedbacks = (productId, { page = 0, size = 5 } = {}) =>
  api.get(`/api/feedbacks/products/${productId}`, { params: { page, size } }).then(r => r.data);

/**
 * (신규) 관리자가 피드백을 삭제합니다.
 */
export const adminDeleteFeedback = (feedbackId) =>
  api.delete(`/api/admin/feedbacks/${feedbackId}`);


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

// ✅ 카테고리별 목록(클라이언트 필터)
export async function fetchProductsByCategory(category) {
  const all = await listMyProducts()
  if (!category) return all
  const norm = v => String(v ?? '').trim().toLowerCase()
  return all.filter(p => norm(p.category) === norm(category))
}
