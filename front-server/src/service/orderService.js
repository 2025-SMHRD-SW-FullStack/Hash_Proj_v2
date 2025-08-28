// /src/service/orderService.js
// axios default export든 named export든 모두 대응
import apiDefault, { axiosInstance as apiNamed } from '/src/config/axiosInstance'
const api = apiDefault ?? apiNamed

/** ✅ 주문 체크아웃: 주문 생성 + 결제금액/주문번호 반환
 *  /api/orders/checkout -> /api/me/orders/checkout -> /api/checkout 순으로 시도
 */
export const checkout = async (payload) => {
  const candidates = [
    '/api/orders/checkout',
    '/api/me/orders/checkout',
    '/api/checkout',
  ]
  let lastErr
  for (const path of candidates) {
    try {
      const { data } = await api.post(path, payload)
      return data // { orderUid, orderId?, payAmount, ... }
    } catch (e) {
      lastErr = e
      const st = e?.response?.status
      if (st !== 404 && st !== 405) throw e
    }
  }
  throw lastErr
}

/** 내 주문 목록 */
export const getMyOrders = () =>
  api.get('/api/me/orders').then((r) => r.data)

/** 내 주문 상세 */
export const getMyOrderDetail = (orderId) =>
  api.get(`/api/me/orders/${orderId}`).then((r) => r.data)

/** 구매 확정 */
export const confirmPurchase = (orderId) =>
  api.post(`/api/me/orders/${orderId}/confirm`).then((r) => r.data)

/** 배송 조회(스윗트래커 프록시: tracking → timeline 폴백) */
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

/* ─────────────────────────────────────────────────────────────
 *  셀러 주문 (스웨거 확정 경로)
 *  - 목록(그리드): GET  /api/seller/orders/grid
 *  - CSV:        GET  /api/seller/orders/grid/export
 *  - 송장등록:    POST /api/seller/orders/{orderId}/shipments
 *  params: { status, from, to, q, page, size }
 * ──────────────────────────────────────────────────────────── */

/** 목록(그리드) */
export const fetchSellerOrders = async ({
  status, from, to, q, page = 0, size = 20,
} = {}) => {
  const params = { page, size }
  if (status && status !== 'ALL') params.status = status
  if (from) params.from = from          // 'YYYY-MM-DD'
  if (to) params.to = to                // 'YYYY-MM-DD'
  if (q) params.q = q                   // 주문번호/수취인/연락처 등

  const { data } = await api.get('/api/seller/orders/grid', { params })
  return {
    items: data?.content ?? [],
    page: {
      number: data?.number ?? 0,
      size: data?.size ?? (data?.content?.length ?? 0),
      totalElements: data?.totalElements ?? 0,
      totalPages: data?.totalPages ?? 1,
    },
  }
}

/** 송장(배송정보) 등록
 * payload: { carrierCode, carrierName, trackingNo }
 * 백에 따라 courier*를 쓰는 경우가 있어 둘 다 보냄(호환)
 */
export const registerShipment = async (orderId, {
  carrierCode, carrierName, trackingNo,
}) => {
  const body = {
    carrierCode, carrierName, trackingNo,
    courierCode: carrierCode, courierName: carrierName, // 호환 필드
  }
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
  const { data } = await api.get('/api/seller/orders/grid/export', {
    params,
    responseType: 'blob',
  })
  return data
}

/** 배송 추적(주문ID 기준) */
export const fetchTracking = async (orderId) => {
  const { data } = await api.get(`/api/shipments/${orderId}/tracking`)
  return data
}

/** (구버전 호환) /api/seller/orders 호출하던 코드 방어용 */
export const getSellerOrders = async (params = {}) => {
  try {
    const { data } = await api.get('/api/seller/orders/grid', { params })
    return data?.content ?? []
  } catch (e) {
    console.warn('getSellerOrders() fallback -> []', e?.response?.status, e?.message)
    return []
  }
}
