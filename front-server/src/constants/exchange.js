// src/constants/exchange.js
export const EXCHANGE_STATUS_LABEL = {
  REQUESTED: '신청',
  APPROVED : '승인',
  REJECTED : '반려',
  SHIPPING : '재발송중',
  COMPLETED: '완료',
  PENDING  : '신청',
};

export const getExchangeStatusLabel = (s) =>
  EXCHANGE_STATUS_LABEL?.[String(s || '').toUpperCase()] || s || '-';
