// axios default export든 named export든 모두 대응
import apiDefault, { axiosInstance as apiNamed } from '/src/config/axiosInstance'
const api = apiDefault ?? apiNamed

/** ✅ 주문 체크아웃
 *  - 기본: /api/orders/checkout
 *  - 예비: /api/me/orders/checkout, /api/checkout
 *  - 404/405는 다음 후보 시도
 *  - VITE_CHECKOUT_PATH 있으면 강제 사용
 */
export const checkout = async (payload) => {
  const forced = (import.meta.env.VITE_CHECKOUT_PATH || '').trim()
  if (forced) {
    const { data } = await api.post(forced, payload)
    return data
  }

  const urls = [
    '/api/orders/checkout',
    '/api/me/orders/checkout',
    '/api/checkout',
  ]

  let lastErr
  for (const url of urls) {
    try {
      const { data } = await api.post(url, payload)
      return data
    } catch (e) {
      const st = e?.response?.status
      if (st === 404 || st === 405) { lastErr = e; continue }
      throw e
    }
  }
  throw lastErr ?? new Error('No checkout endpoint matched')
}

/** 내 주문 목록 */
export const getMyOrders = () =>
  api.get('/api/me/orders').then(r => r.data)

/** 내 주문 상세 */
export const getMyOrderDetail = (orderId) =>
  api.get(`/api/me/orders/${orderId}`).then(r => r.data)

/** 구매 확정 */
export const confirmPurchase = (orderId) =>
  api.post(`/api/me/orders/${orderId}/confirm`).then(r => r.data)

/** 배송 타임라인 */
export const getTracking = async (orderId) => {
  try {
    const { data } = await api.get(`/api/me/orders/${orderId}/tracking`)
    return data
  } catch (e) {
    const st = e?.response?.status
    if (st === 404 || st === 405) {
      const { data } = await api.get(`/api/me/orders/${orderId}/timeline`)
      return data
    }
    throw e
  }
}

/** 피드백 완료 여부(있으면 true) */
export const checkFeedbackDone = async (orderId) => {
  const urls = [
    `/api/me/orders/${orderId}/feedback/done`,
    `/api/feedbacks/done?orderId=${orderId}`,
    `/api/feedbacks/by-order/${orderId}/done`,
  ]
  for (const url of urls) {
    try {
      const { data } = await api.get(url)
      return Boolean(data?.done ?? data)
    } catch (e) {
      const st = e?.response?.status
      if (st === 404 || st === 405) continue
      throw e
    }
  }
  return false
}

/** (신규) 구매확정/피드백 가능 윈도우 조회 */
export const getConfirmWindow = (orderId) =>
  api.get(`/api/me/orders/${orderId}/window`).then(r => r.data)

/* ─────────────────────────────────────────────────────────────
 *  셀러 주문 (스웨거 확정 경로)
 *  - 목록(그리드): GET  /api/seller/orders/grid
 *  - CSV:        GET  /api/seller/orders/grid/export
 *  - 송장등록:    POST /api/seller/orders/{orderId}/shipments
 *  params: { status, from, to, q, page, size }
 * ──────────────────────────────────────────────────────────── */

/** 목록(그리드) — 하위호환을 보장하는 반환형 */
export const fetchSellerOrders = async ({
  status, from, to, q, page = 0, size = 20,
} = {}) => {
  const statusApi = mapStatusForApi(status)
  const params = { page, size }
  if (statusApi) params.status = statusApi     // 허용되지 않으면 아예 안 보냄
  if (from) params.from = from
  if (to) params.to = to
  if (q) params.q = q
  const { data } = await api.get('/api/seller/orders/grid', { params })

  // 서버가 Page 또는 배열을 반환할 수 있으므로 하위호환 형태로 래핑
  if (Array.isArray(data)) {
    const content = data
    return {
      content,
      items: content,
      number: 0, size: content.length, totalElements: content.length, totalPages: 1,
      page: { number: 0, size: content.length, totalElements: content.length, totalPages: 1 },
    }
  }

  const content = data?.content ?? []
  return {
    ...data,
    content,
    items: content,
    page: {
      number: data?.number ?? 0,
      size: data?.size ?? content.length,
      totalElements: data?.totalElements ?? content.length,
      totalPages: data?.totalPages ?? 1,
    },
  }
}

/** 송장(배송정보) 등록
 *  payload 허용: { courierCode?, courierName?, trackingNo? }
 *               { carrierCode?, carrierName?, trackingNo? } 호환
 */
export const registerShipment = async (orderId, payload = {}) => {
  const courierCode = payload.courierCode ?? payload.carrierCode ?? payload.code ?? ''
  const courierName = payload.courierName ?? payload.carrierName ?? payload.name ?? ''
  const trackingNo = payload.trackingNo ?? payload.tracking ?? payload.trackingNumber ?? ''

  if (!courierCode) throw new Error('courierCode is required')
  if (!trackingNo) throw new Error('trackingNo is required')

  // 🔑 백엔드 DTO 필드명과 1:1 일치
  const body = { courierCode, courierName, trackingNo }
  const { data } = await api.post(`/api/seller/orders/${orderId}/shipments`, body)
  return data // Long(등록된 shipment id 등)
}

/** CSV 다운로드 URL (a.href로 사용) */
export const buildOrdersCsvUrl = ({ status, from, to, q } = {}) => {
  const qs = new URLSearchParams()
  if (status && status !== 'ALL') qs.set('status', status)
  if (from) qs.set('from', from)
  if (to) qs.set('to', to)
  if (q) qs.set('q', q)
  return `/api/seller/orders/grid/export${qs.toString() ? `?${qs.toString()}` : ''}`
}

/** CSV 다운로드(Blob이 필요한 경우) */
export const exportSellerOrdersCSV = async (params = {}) => {
  const p = {}
  if (params.status && params.status !== 'ALL') p.status = params.status
  if (params.from) p.from = params.from
  if (params.to) p.to = params.to
  if (params.q) p.q = params.q

  const res = await api.get('/api/seller/orders/grid/export', {
    params: p,
    responseType: 'blob',
  })
  return res // { data: Blob, headers: {...} }
}

/** 배송 추적(주문ID 기준) — 기존 getTracking 재사용 */
export const fetchTracking = (orderId) => getTracking(orderId)


// UI 상태 → API 상태 매핑
// 신규주문은 보통 결제완료(PAID)로 해석하는 게 자연스러워요.
const STATUS_MAP = {
  ALL: null,
  NEW: 'PAID',             // ✅ 신규주문
  READY: 'READY',          // 배송준비
  SHIPPING: 'IN_TRANSIT',  // 배송중
  DELIVERED: 'DELIVERED',  // 배송완료
  CONFIRMED: 'CONFIRMED',  // 구매확정
}
const mapStatusForApi = (ui) => STATUS_MAP[ui?.toUpperCase?.()] ?? null

// 그리드 조회 래퍼
export async function fetchSellerOrdersGrid({ statusKey = 'ALL', page = 0, size = 20, q, from, to } = {}) {
  const params = { page, size }
  const mapped = ORDER_STATUS_MAP[statusKey] ?? null
  if (mapped) params.status = mapped       // ALL이면 status 생략
  if (q) params.q = q
  if (from) params.from = from
  if (to) params.to = to

  const res = await api.get('/api/seller/orders/grid', {
    params,
    validateStatus: () => true,            // 4xx/5xx throw 금지
  })
  if (res.status < 200 || res.status >= 300) throw new Error(`orders/grid ${res.status}`)
  return res.data
}


