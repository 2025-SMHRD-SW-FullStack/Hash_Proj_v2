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