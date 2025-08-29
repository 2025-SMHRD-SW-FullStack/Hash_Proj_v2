// 일별 매출/건수/구매자수 시계열 생성
// 반환: [{ date:'YYYY-MM-DD', label:'MM/DD', amount, orderCount, buyerCount }, ...]
import { rangeDays, ymd } from './datetime'

// 주문의 날짜/구매자 필드 유연 매핑
const orderDateOf = (o) => o.orderedAt || o.createdAt || o.paidAt || o.deliveredAt || o.date
const buyerIdOf   = (o) => o.buyerId || o.userId || o.customerId || o.uid || o.buyer?.id

export function buildDailySalesSeries(orders = [], days = 14) {
  const dates = rangeDays(days)
  const base = Object.fromEntries(
    dates.map(d => [d, { date: d, amount: 0, orderCount: 0, buyers: new Set() }])
  )

  for (const o of orders) {
    const d0 = orderDateOf(o); if (!d0) continue
    const d = ymd(d0); if (!base[d]) continue
    base[d].amount += Number(o.price ?? 0)
    base[d].orderCount += 1
    const uid = buyerIdOf(o); if (uid != null) base[d].buyers.add(uid)
  }

  return dates.map(d => ({
    date: d,
    label: d.slice(5).replace('-', '/'),
    amount: base[d].amount,
    orderCount: base[d].orderCount,
    buyerCount: base[d].buyers.size,
  }))
}
