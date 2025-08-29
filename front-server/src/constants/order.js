// 백엔드 상태코드 ↔ 한글 라벨
export const ORDER_STATUS_LABEL = {
  PENDING: '배송준비중',
  SHIPPED: '배송중',
  DELIVERED: '배송완료',
  CONFIRMED: '구매확정',
  EXCHANGE_REQUESTED: '교환요청',
  RETURN_REQUESTED: '반품요청',
  CANCEL_REQUESTED: '취소요청',
}

export const toLabel = (code) => ORDER_STATUS_LABEL[code] || code
export const toCode = (label) => {
  const found = Object.entries(ORDER_STATUS_LABEL).find(([, v]) => v === label)
  return found ? found[0] : label
}
