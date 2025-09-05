// src/service/exchangeService.js

import api from '../config/axiosInstance';
const EXCHANGE_BASE = '/api/seller/exchanges';

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
 * 셀러 교환 관련 서비스
 */

/** 대기중인 교환 목록 조회 */
export const fetchPendingExchanges = async (params = {}) => {
  try {
    const { data } = await api.get(`${EXCHANGE_BASE}/pending`, {
      params,
      validateStatus: () => true,
    })
    return data
  } catch (error) {
    console.error('대기중 교환 목록 로드 실패:', error)
    throw error
  }
}

/** 교환 승인 */
export const approveExchange = async (exchangeId, payload) => {
  try {
    const { data } = await api.post(`${EXCHANGE_BASE}/${exchangeId}/approve`, payload, {
      validateStatus: () => true,
    })
    return data
  } catch (error) {
    console.error('교환 승인 실패:', error)
    throw error
  }
}

/** 교환 반려 */
export const rejectExchange = async (exchangeId, payload) => {
  try {
    const { data } = await api.post(`${EXCHANGE_BASE}/${exchangeId}/reject`, payload, {
      validateStatus: () => true,
    })
    return data
  } catch (error) {
    console.error('교환 반려 실패:', error)
    throw error
  }
}

/** 교환 발송 (송장 등록) */
// 오버로드 지원:
// 1) shipExchange(id, { courierCode, trackingNumber })   // 프론트 다이얼로그에서 주는 키
// 2) shipExchange(id, { carrier, invoiceNo })            // 백엔드가 기대하는 키
// 3) shipExchange(id, carrier, invoiceNo)                // 포지셔널
export const shipExchange = async (exchangeId, payloadOrCarrier, invoiceNo) => {
  try {
    const payload = (payloadOrCarrier && typeof payloadOrCarrier === 'object')
      ? payloadOrCarrier
      : { carrier: payloadOrCarrier, invoiceNo };

    // 키 이름 차이를 흡수해서 서버에 전달
    const params = {
      carrier: payload.carrier ?? payload.courierCode ?? '',
      invoiceNo: payload.invoiceNo ?? payload.trackingNumber ?? '',
    };

    const { data } = await api.post(`${EXCHANGE_BASE}/${exchangeId}/ship`, null, {
      params,
      validateStatus: () => true,
    });
    if (data == null) throw new Error('empty response');
    return data;
  } catch (error) {
    console.error('교환 발송 실패:', error);
    throw error;
  }
}

/** 교환 추적 */
export const trackExchange = async (exchangeId) => {
  try {
    const { data } = await api.get(`${EXCHANGE_BASE}/${exchangeId}/tracking`, {
      validateStatus: () => true,
    })
    return data
  } catch (error) {
    console.error('교환 추적 실패:', error)
    throw error
  }
}


/**
 * 주문관리 테이블에서 바로 쓰기 위한 그리드 어댑터
 * - /pending 응답이 배열/페이지형 둘 다 올 수 있다고 가정하고 안전 매핑
 */
export async function fetchSellerExchangesGrid({ page = 0, size = 20, q } = {}) {
  const data = await fetchPendingExchanges({ page, size, q });
  const content = Array.isArray(data?.content) ? data.content
    : (Array.isArray(data) ? data : (data?.list || []));
  const totalElements = (typeof data?.totalElements === 'number') ? data.totalElements : content.length;

  const rows = content.map(v => ({
    id: v.id,
    exchangeId: v.id,
    orderNo: v.orderNo ?? v.orderId ?? v.order?.orderNo ?? v.order?.id ?? '-',
    productName: v.productName || v.product?.name || v.orderItem?.productName || '-',
    buyerName: v.buyerName ?? v.requesterName ?? v.user?.nickname ?? v.user?.name ?? v.receiver ?? '-',
    reason: v.reason ?? v.reasonText ?? '-',
    status: v.status ?? v.state ?? 'REQUESTED',
    requestedAt: v.createdAt ?? v.requestedAt ?? null,
  }));

  return {
    rows,
    totalElements,
    totalPages: data?.totalPages ?? 1,
    page: data?.number ?? page,
    size: data?.size ?? size,
  };
}