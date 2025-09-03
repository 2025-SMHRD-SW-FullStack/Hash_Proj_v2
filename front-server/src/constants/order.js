// 백엔드 OrderStatus enum과 일치하는 상태 라벨
export const ORDER_STATUS_LABEL = {
  // 백엔드 enum 상태
  PENDING: '결제대기',
  PAID: '결제완료',
  READY: '배송준비중',
  IN_TRANSIT: '배송중',
  DELIVERED: '배송완료',
  CONFIRMED: '구매확정',
  
  // 기타 상태 (하위호환)
  EXCHANGE_REQUESTED: '교환요청',
  RETURN_REQUESTED: '반품요청',
  CANCEL_REQUESTED: '취소요청',
}

export const toLabel = (code) => ORDER_STATUS_LABEL[code] || code

// 상태별 색상 클래스
export const ORDER_STATUS_COLOR = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-blue-100 text-blue-800',
  READY: 'bg-orange-100 text-orange-800',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CONFIRMED: 'bg-purple-100 text-purple-800',
  EXCHANGE_REQUESTED: 'bg-pink-100 text-pink-800',
  RETURN_REQUESTED: 'bg-red-100 text-red-800',
  CANCEL_REQUESTED: 'bg-gray-100 text-gray-800',
}

export const getStatusColor = (status) => ORDER_STATUS_COLOR[status] || 'bg-gray-100 text-gray-800'
