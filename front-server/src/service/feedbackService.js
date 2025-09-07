import api from '../config/axiosInstance'
import axiosAI from '../config/axiosAI'

// ======================= 기존 API들 =======================

export const fetchSellerFeedbacks = async ({ page = 0, size = 50 } = {}) => {
  const res = await api.get('/api/seller/feedbacks', { params: { page, size } })
  return res.data
}

export const getSurveyTemplate = (productId) =>
  api.get(`/api/products/${productId}/survey-template`).then(r => r.data)

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

// ======================= AI 요약: 즉시 생성(1회) =======================

/** 오늘 날짜(YYYY-MM-DD) */
const _today = () => new Date().toISOString().slice(0, 10)

/** 최근 텍스트 피드백 N개 (요약 샘플용) */
async function _fetchRecentFeedbackTexts(productId, limit = 10) {
  try {
    const page = await getProductFeedbacks(productId, { page: 0, size: Math.max(5, limit) })
    const content = page?.content || page?.list || page || []
    return content
      .map((f) => (typeof f?.content === 'string' ? f.content.trim() : ''))
      .filter(Boolean)
      .slice(0, limit)
  } catch {
    return []
  }
}

/**
 * 지금 시점의 지표로 AI 요약 1건 계산
 * 반환: { headline, keyPoints, actions, fullSummary, model, createdAt }
 */
export async function computeAiSummaryNow({ productId, from, to } = {}) {
  if (!productId) throw new Error('productId is required')

  // 필요한 지표 병렬 수집
  const paramsCommon = { productId, from, to }
  const [demo, qsRaw, sumRaw, tpl, recentTexts] = await Promise.all([
    fetchFeedbackDemographics(paramsCommon),
    fetchFeedbackQuestionStats(paramsCommon),
    fetchFeedbackSummary(paramsCommon),
    getSurveyTemplate(productId),
    _fetchRecentFeedbackTexts(productId, 10),
  ])

  // 별점 분포/평균
  const ratingCounts = sumRaw?.ratingCounts || sumRaw?.ratings || sumRaw?.counts || {}
  const starsObj = Object.entries(ratingCounts).reduce((m, [k, v]) => {
    m[String(k)] = Number(v || 0); return m
  }, {})
  const buyerSample =
    Number(sumRaw?.totalCount ?? sumRaw?.total ?? sumRaw?.count ?? 0) ||
    Object.values(starsObj).reduce((s, n) => s + Number(n || 0), 0)
  const overallAvg =
    typeof sumRaw?.averageOverallScore === 'number'
      ? sumRaw.averageOverallScore
      : (typeof sumRaw?.avg === 'number' ? sumRaw.avg : null)

  // 인구통계
  const demoMap = {}
  for (const a of (demo?.byAgeRange ?? [])) {
    const key = String(a?.key ?? '').trim()
    const count = Number(a?.count ?? 0)
    if (key) demoMap[key] = (demoMap[key] || 0) + count
  }

  // 문항(평균/버킷)
  const byQuestionAvg = []
  const byQuestionChoice = []
  for (const q of (qsRaw?.questions ?? [])) {
    const type = String(q?.type || '').toUpperCase()
    if (type.startsWith('SCALE')) {
      byQuestionAvg.push({
        questionId: q?.code ?? q?.id ?? null,
        label: q?.label ?? '',
        average: Number(q?.average ?? 0),
      })
    } else {
      const buckets = {}
      Object.entries(q?.buckets || {}).forEach(([k, v]) => {
        buckets[String(k)] = Number(v || 0)
      })
      byQuestionChoice.push({ questionId: q?.code ?? q?.id ?? null, label: q?.label ?? '', buckets })
    }
  }

  const payload = {
    date: _today(),
    productId: Number(productId),
    productName: tpl?.productName ?? tpl?.name ?? null,
    category: tpl?.category ?? null,
    overallAvg: overallAvg ?? null,
    stars: starsObj,
    demographics: demoMap,
    buyerSample,
    byQuestionAvg,
    byQuestionChoice,
    feedbackTexts: recentTexts,
    previousSummary: null,
  }

  const { data: obj } = await axiosAI.post('/api/ai/summary/daily', payload)
  return { ...(obj || {}), createdAt: new Date().toISOString() }
}

// ======================= 통계 집계 묶음 =======================

export async function fetchFeedbackStats({ productId, from, to }) {
  const paramsCommon = { productId, from, to }

  const [demo, qs, sum, tpl] = await Promise.all([
    fetchFeedbackDemographics(paramsCommon),
    fetchFeedbackQuestionStats(paramsCommon),
    fetchFeedbackSummary(paramsCommon),
    getSurveyTemplate(productId),
  ])

  // 설문 라벨 맵
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

  const byQuestionAvg = []
  const byQuestionChoice = []
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

  const demographics = (demo?.byAgeRange ?? []).map(a => ({
    name: a?.key ?? '',
    value: Number(a?.count ?? 0),
    avg: typeof a?.averageOverallScore === 'number' ? a.averageOverallScore : null,
  }))

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
  }
}

/** 현재 로그인 사용자의 피드백 목록 */
export const getMyFeedbacks = () =>
  api.get('/api/feedbacks/me').then(r => r.data)

export const getFeedbackDetail = (feedbackId) =>
  api.get(`/api/feedbacks/${feedbackId}`).then(r => r.data)

export const getProductFeedbacks = (productId, { page = 0, size = 5 } = {}) => {
  const id = Number(productId)
  if (!id) throw new Error('getProductFeedbacks: valid productId is required')
  return api
    .get(`/api/feedbacks/products/${id}`, { params: { page, size } })
    .then(r => r.data)
}

// 상품 기준으로 내가 피드백을 가진 상태인지
export const hasMyFeedbackForProduct = async (productId) => {
  const { data } = await api.get(`/api/feedbacks/product/${productId}/done`);
  return Boolean(data?.done ?? data);
};

// 상품 기준: 내 피드백 수정 가능 윈도우 (없으면 open=false로 리턴)
export const getMyFeedbackWindowForProduct = async (productId) => {
  const res = await api.get(`/api/feedbacks/me/product/${productId}/window`, { validateStatus: () => true });
  if (res.status >= 200 && res.status < 300) return res.data; // { open, remainingSeconds, deadlineAt, feedbackId }
  return { open: false, remainingSeconds: 0, deadlineAt: null };
};

export const getMyFeedbackEligibilityForProduct = async (productId) => {
  const res = await api.get(`/api/feedbacks/me/product/${productId}/eligibility`, { validateStatus: () => true });
  if (res.status >= 200 && res.status < 300) return res.data; // { hasFeedback, canEdit, blocked }
  return { hasFeedback: false, canEdit: false, blocked: false };
};

// 상품 기준으로 내 피드백 ID 가져오기(있으면 ID, 없으면 null)
export const getMyFeedbackIdByProduct = async (productId) => {
  try {
    const res = await api.get(`/api/feedbacks/me/product/${productId}/id`, { validateStatus: () => true });
    if (res.status >= 200 && res.status < 300) {
      return res?.data?.feedbackId ?? res?.data?.id ?? null;
    }
  } catch (_) {}
  return null;
};


/** 관리자 삭제 */
export async function deleteFeedbackByAdmin(feedbackId) {
  if (!feedbackId) throw new Error('feedbackId is required');
  const res = await api.delete(`/api/admin/feedbacks/${feedbackId}`, {
    validateStatus: () => true,
  });
  if (res.status < 200 || res.status >= 300) {
    const msg = res?.data?.message || `삭제 실패 (${res.status})`;
    throw new Error(msg);
  }
  return res.data; // 200 OK
}

/**
 * 피드백 제출: 성공 시 해당 상품의 AI 요약 즉시 생성 트리거
 */
export const submitFeedback = async (payload) => {
  const res = await api.post(`/api/feedbacks`, payload)
  try {
    const productId = res?.data?.productId
    if (productId) {
      await computeAiSummaryNow({ productId })
    }
  } catch (_) { /* 조용히 무시 */ }
  return res.data
}

// ====== 피드백 통계용 보조 ======
let _myProductsCache = null
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

const CATEGORY_ALIAS = { '무형자산(플랫폼)': '무형자산' }
const toCanonicalCategory = (c) =>
  CATEGORY_ALIAS[c] ?? String(c || '').replace(/\(.*?\)/g, '').trim()

export async function fetchProductsByCategory(category) {
  const all = await listMyProducts()
  const key = toCanonicalCategory(category)
  if (!key) return all
  const norm = v => toCanonicalCategory(v).toLowerCase()
  return all.filter(p => norm(p.category) === norm(key))
}

// [셀러] 피드백 상세
export const getSellerFeedbackDetail = (feedbackId) =>
  api.get(`/api/seller/feedbacks/${feedbackId}`).then(r => r.data)


// (신규) 피드백 수정
export const updateFeedback = async (id, { content, images = [] }) => {
  const body = {
    content,
    imagesJson: JSON.stringify(images), // Swagger: imagesJson(string)
  };
  const res = await api.patch(`/api/feedbacks/${id}`, body, {
    validateStatus: () => true,
  });
  if (res.status < 200 || res.status >= 300) {
    const msg = res?.data?.message || `피드백 수정 실패 (${res.status})`;
    throw new Error(msg);
  }
  return res?.data?.data ?? res?.data;
};
