export const levelToOrderStatus = (lv) => (lv >= 6 ? 'DELIVERED' : lv >= 3 ? 'IN_TRANSIT' : 'READY')
export const levelToKorean = (lv) => ({
  1: '배송준비중', 2: '집화완료', 3: '배송중', 4: '지점 도착', 5: '배송출발', 6: '배송 완료'
}[lv] || '배송중')