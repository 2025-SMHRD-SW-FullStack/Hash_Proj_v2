// /src/service/orderService.js
import api from '../config/axiosInstance'

/** 베이스 경로 — 백엔드가 다르면 여기 한 줄만 수정 */
const ORDERS_BASE = '/api/seller/orders'

/** 실패 시에도 동일한 페이지네이션 shape 보장 */
const emptyPage = (page = 0, size = 20) => ({
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: page,
  size,
})

/**
 * (레거시) 단순 목록 — 실패 시 [] 반환
 * 페이지네이션 테이블에서 .content 접근하면 터질 수 있으니
 * 새 코드는 getSellerOrdersPaged 또는 fetchSellerOrders 사용 권장
 */
export const getSellerOrders = async (params = {}) => {
  try {
    const res = await api.get(ORDERS_BASE, { params })
    return res.data
  } catch (e) {
    console.warn('getSellerOrders() fallback -> []', e?.response?.status, e?.message)
    return [] // ← 구버전 호환용
  }
}

/** ✅ 주문 목록 (페이지네이션 + 상태/검색/기간 필터) */
export const getSellerOrdersPaged = async ({
  page = 0, size = 20, status, q, from, to
} = {}) => {
  try {
    const params = { page, size }
    if (status && status !== 'ALL') params.status = status
    if (q && q.trim()) params.q = q.trim()
    if (from) params.from = from   // 'YYYY-MM-DD'
    if (to)   params.to   = to     // 'YYYY-MM-DD'

    const res = await api.get(ORDERS_BASE, { params })
    // 기대 응답: { content, totalElements, totalPages, number, size }
    return res.data
  } catch (e) {
    console.warn('getSellerOrdersPaged() fallback -> emptyPage', e?.response?.status, e?.message)
    return emptyPage(page, size)
  }
}

/** ✅ 페이지네이션 목록의 별칭 — 페이지 코드에서 fetchSellerOrders로 임포트해도 동작 */
export const fetchSellerOrders = getSellerOrdersPaged

/** ✅ 단건 상세 조회 */
export const getOrderDetail = async (orderId) => {
  const res = await api.get(`${ORDERS_BASE}/${orderId}`)
  return res.data
}

/** ✅ 운송장 등록/수정 */
export const updateShipment = async (orderId, { carrierCode, invoiceNo }) => {
  const payload = { carrierCode, invoiceNo }
  const res = await api.post(`${ORDERS_BASE}/${orderId}/shipment`, payload)
  return res.data
}

/** ✅ 상태 변경(단건) — 예: 'SHIPPED', 'CONFIRMED' */
export const changeOrderStatus = async (orderId, status) => {
  const res = await api.post(`${ORDERS_BASE}/${orderId}/status`, { status })
  return res.data
}

/** ✅ 상태 변경(일괄) */
export const bulkChangeOrderStatus = async ({ ids, status }) => {
  const res = await api.post(`${ORDERS_BASE}/status:bulk`, { ids, status })
  return res.data
}

/** ✅ (선택) 엑셀 다운로드 */
export const exportOrders = async ({ status, from, to } = {}) => {
  const params = {}
  if (status && status !== 'ALL') params.status = status
  if (from) params.from = from
  if (to)   params.to   = to
  const res = await api.get(`${ORDERS_BASE}/export`, { params, responseType: 'blob' })
  return res.data // blob
}
