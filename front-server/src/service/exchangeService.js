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
 * 셀러 교환 관련 서비스
 */

/** 대기중인 교환 목록 조회 */
export const fetchPendingExchanges = async () => {
  try {
    const { data } = await api.get('/api/seller/exchanges/pending')
    return data
  } catch (error) {
    console.error('대기중 교환 목록 로드 실패:', error)
    throw error
  }
}

/** 교환 승인 */
export const approveExchange = async (exchangeId, payload) => {
  try {
    const { data } = await api.post(`/api/seller/exchanges/${exchangeId}/approve`, payload)
    return data
  } catch (error) {
    console.error('교환 승인 실패:', error)
    throw error
  }
}

/** 교환 반려 */
export const rejectExchange = async (exchangeId, payload) => {
  try {
    const { data } = await api.post(`/api/seller/exchanges/${exchangeId}/reject`, payload)
    return data
  } catch (error) {
    console.error('교환 반려 실패:', error)
    throw error
  }
}

/** 교환 발송 (송장 등록) */
export const shipExchange = async (exchangeId, carrier, invoiceNo) => {
  try {
    const { data } = await api.post(`/api/seller/exchanges/${exchangeId}/ship`, null, {
      params: { carrier, invoiceNo }
    })
    return data
  } catch (error) {
    console.error('교환 발송 실패:', error)
    throw error
  }
}

/** 교환 추적 */
export const trackExchange = async (exchangeId) => {
  try {
    const { data } = await api.get(`/api/seller/exchanges/${exchangeId}/tracking`)
    return data
  } catch (error) {
    console.error('교환 추적 실패:', error)
    throw error
  }
}