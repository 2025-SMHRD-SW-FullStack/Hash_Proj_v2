// src/service/exchangeService.js

import api from '../config/axiosInstance';

/**
 * 현재 사용자의 모든 교환 신청 내역을 조회합니다.
 * @returns {Promise<Array>} 교환 내역 배열
 */
export const getMyExchanges = () => 
  api.get('/api/me/exchanges').then(res => res.data);

/**
 * 교환 신청을 서버에 제출합니다. (기존 함수)
 * @param {number} orderItemId - 교환할 주문 아이템 ID
 * @param {object} payload - { qty, reasonText, imageUrls }
 */
export const requestExchange = (orderItemId, payload) => {
  const finalPayload = {
    qty: payload.qty || 1,
    reasonText: payload.reasonText || '',
    imageUrls: payload.imageUrls || [],
    requestedVariantId: null,
  };

  return api.post(`/api/me/exchanges/order-items/${orderItemId}`, finalPayload)
    .then(res => res.data);
};


/* =========================================================
 * 셀러(사장) 영역
 * ======================================================= */

/**
 * 교환 대기 목록 조회 (사장)
 * 응답 스키마가 달라도 공통 필드로 정규화해서 반환합니다.
 * { content: Array<ExchangeRow>, totalElements: number }
 */
export async function listPendingExchanges({ page = 0, size = 50 } = {}) {
  const res = await api.get('/api/seller/exchanges/pending', {
    params: { page, size },
    validateStatus: () => true,
  })
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`/api/seller/exchanges/pending ${res.status}`)
  }

  // 페이지네이션/배열 모두 커버
  const raw = res.data
  const rows = Array.isArray(raw) ? raw : (raw?.content ?? raw?.items ?? raw?.list ?? [])

  const normalized = (Array.isArray(rows) ? rows : []).map(n => ({
    id: n?.id ?? n?.exchangeId ?? null,
    orderId: n?.orderId ?? n?.orderUid ?? n?.orderNo ?? null,
    productName: n?.productName ?? n?.itemName ?? n?.product?.name ?? '',
    receiver: n?.receiver ?? n?.buyerName ?? n?.receiverName ?? '',
    phone: n?.phone ?? n?.receiverPhone ?? '',
    address: n?.address ?? n?.receiverAddress ?? '',
    reason: n?.reason ?? n?.requestReason ?? '',
    requestedAt: n?.requestedAt ?? n?.createdAt ?? n?.requestedDate ?? '',
    raw: n,
  })).filter(r => r.id != null)

  return {
    content: normalized,
    totalElements: raw?.totalElements ?? normalized.length ?? 0,
  }
}

/**
 * 교환 승인 (사장)
 * @param {number|string} exchangeId
 */
export function approveExchange(exchangeId) {
  return api
    .post(`/api/seller/exchanges/${exchangeId}/approve`)
    .then(res => res.data)
}

/**
 * 교환 반려 (사유 입력)
 * @param {number|string} exchangeId
 * @param {string} reason
 */
export function rejectExchange(exchangeId, reason) {
  return api
    .post(`/api/seller/exchanges/${exchangeId}/reject`, { reason })
    .then(res => res.data)
}

/**
 * 교환 발송 등록 (송장)
 * @param {number|string} exchangeId
 * @param {{courierCode:string, trackingNumber:string}} payload
 */
export function shipExchange(exchangeId, { courierCode, trackingNumber }) {
  return api
    .post(`/api/seller/exchanges/${exchangeId}/ship`, { courierCode, trackingNumber })
    .then(res => res.data)
}

/**
 * (선택) 교환 송장 추적
 * @param {number|string} exchangeId
 */
export function getExchangeTracking(exchangeId) {
  return api
    .get(`/api/seller/exchanges/${exchangeId}/tracking`)
    .then(res => res.data)
}