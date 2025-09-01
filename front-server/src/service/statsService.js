// /src/service/statsService.js
import api from '/src/config/axiosInstance'
import { fetchSellerOrders } from '/src/service/orderService'
import { fetchSellerFeedbackGrid } from '/src/service/feedbackService'

/* ----------------------- 공통 유틸 ----------------------- */

// 프론트/서드파티 상태명을 백엔드가 받는 값으로 통일
const mapStatusForApi = (s = '') => {
  const u = String(s).toUpperCase()
  const M = {
    PREPARING: 'READY',
    READY_FOR_SHIPMENT: 'READY',
    READY_FOR_DELIVERY: 'READY',
    READY: 'READY',

    IN_TRANSIT: 'SHIPPING',
    SHIPPED: 'SHIPPING',
    ON_DELIVERY: 'SHIPPING',
    SHIPPING: 'SHIPPING',

    DELIVERED: 'DELIVERED',
    COMPLETE: 'DELIVERED',
    COMPLETED: 'DELIVERED',

    NEW: 'NEW',
    EXCHANGE_REQUESTED: 'EXCHANGE_REQUESTED',
    RETURN: 'RETURN',
    CANCEL: 'CANCELLED',
    CANCELLED: 'CANCELLED',
  }
  return M[u] || u
}

// YYYY-MM-DD -> MM/DD
const toMMDD = (ymd) => {
  const s = String(ymd || '').replace(/[^0-9]/g, '')
  if (s.length >= 8) return `${s.slice(4, 6)}/${s.slice(6, 8)}`
  return ymd || ''
}

const resolveDate = (r) =>
  r?.deliveredAt?.slice(0, 10) ||
  r?.paidAt?.slice(0, 10) ||
  r?.createdAt?.slice(0, 10) ||
  null

const resolveAmount = (r) =>
  r?.payAmount ?? r?.amount ?? r?.totalAmount ?? r?.paymentAmount ?? 0

const normalizeStats = (arr) =>
  arr.map((x) => ({
    date: toMMDD(x.date || x.statDate || x.day || x.createdDate || x.deliveredDate),
    amount: Number(x.amount ?? x.amountSum ?? x.totalAmount ?? 0),
    orders: Number(x.orders ?? x.orderCount ?? 0),
    payers: Number(x.payers ?? x.payerCount ?? x.distinctBuyerCount ?? 0),
  }))

// 응답 모양이 레포마다 달라서 안전하게 total 뽑기
const extractTotal = (res) => {
  const d = res?.data ?? res
  if (typeof d?.totalElements === 'number') return d.totalElements
  if (typeof d?.total === 'number') return d.total
  if (Array.isArray(d?.content)) return d.content.length
  if (Array.isArray(d?.rows)) return d.rows.length
  if (Array.isArray(d)) return d.length
  return Number(d?.count ?? 0)
}

/* ----------------------- 대시보드 메인 카운트 ----------------------- */
/** 셀러 메인: 신규주문/교환요청/신규 피드백 카운트 */
export async function fetchDashboardCounts() {
  const [newOrdersRes, exchReqRes, newFbRes] = await Promise.all([
    fetchSellerOrders({ status: 'NEW', page: 0, size: 1 }).catch(() => 0),
    fetchSellerOrders({ status: 'EXCHANGE_REQUESTED', page: 0, size: 1 }).catch(() => 0),
    fetchSellerFeedbackGrid({ status: 'NEW_WRITE', page: 0, size: 1 }).catch(() => 0),
  ])

  return {
    newOrders: typeof newOrdersRes === 'number' ? 0 : extractTotal(newOrdersRes),
    exchangeRequests: typeof exchReqRes === 'number' ? 0 : extractTotal(exchReqRes),
    newFeedbacks: typeof newFbRes === 'number' ? 0 : extractTotal(newFbRes),
  }
}

/* ----------------------- 상태별 주문 카운트 ----------------------- */
/**
 * 상태별 주문 카운트
 *  - 더 이상 없는 /summary|/stats|/counts 호출하지 않음(404 없앰)
 *  - /grid?page=0&size=1의 totalElements 로 정확/저비용 집계
 */
// 상태별 카운트(사이드바 요약용)
export async function fetchOrderStatusCounts() {
  const safeTotal = (d) =>
    typeof d?.totalElements === 'number' ? d.totalElements
    : typeof d?.total === 'number' ? d.total
    : Array.isArray(d?.content) ? d.content.length
    : Array.isArray(d?.rows) ? d.rows.length
    : 0

  const get = async (key) => {
    try {
      const data = await fetchSellerOrdersGrid({ statusKey: key, page: 0, size: 1 })
      return safeTotal(data)
    } catch { return 0 }
  }

  const [ready, shipping, delivered, all] = await Promise.all([
    get('READY'),
    get('SHIPPING'),
    get('DELIVERED'),
    get('ALL'),
  ])
  return { READY: ready, SHIPPING: shipping, DELIVERED: delivered, ALL: all }
}

/* ----------------------- 매출 통계 ----------------------- */
/**
 * 매출 통계: 더 이상 없는 /stats 엔드포인트를 치지 않고,
 * /grid 주문 목록으로 일자별 합산(404 콘솔 제거)
 */
export const fetchSalesStats = async ({ from, to } = {}) => {
  // 주문목록 집계
  let rows
  try {
    const res = await fetchSellerOrders?.({ from, to, size: 1000 })
    rows = res?.content || res?.list || res || []
  } catch (e) {
    // 폴백: 옛날 호환용 /api/seller/orders (있을 수도)
    const { data, status } = await api.get('/api/seller/orders', {
      params: { from, to, size: 1000 },
      validateStatus: () => true,
    })
    if (status >= 200 && status < 300) {
      rows = data?.content || data?.list || data || []
    } else {
      throw e
    }
  }

  const byDate = new Map()
  for (const r of rows) {
    const dYmd = resolveDate(r)
    if (!dYmd) continue
    const key = dYmd
    const existing =
      byDate.get(key) || { date: toMMDD(key), amount: 0, orders: 0, payersSet: new Set() }
    existing.amount += Number(resolveAmount(r) || 0)
    existing.orders += 1
    const buyer = r?.buyerId || r?.memberId || r?.userId || r?.buyer?.id || r?.customerId
    if (buyer) existing.payersSet.add(buyer)
    byDate.set(key, existing)
  }

  return Array.from(byDate.values())
    .map((it) => ({
      date: it.date,
      amount: it.amount,
      orders: it.orders,
      payers: it.payersSet.size,
    }))
    .sort((a, b) => (a.date > b.date ? 1 : -1))
}

/* ----------------------- 보조 요약(선택) ----------------------- */
export async function fetchOrdersSummary({ from, to } = {}) {
  const res = await fetchSellerOrders({ from, to, size: 1000 })
  const list = res?.content ?? res?.list ?? res ?? []
  return list.reduce(
    (a, o) => {
      const v = Number(o?.payAmount ?? o?.amount ?? o?.totalAmount ?? 0)
      a.orders += 1
      a.sales += v
      return a
    },
    { orders: 0, sales: 0 }
  )
}

/* ----------------------- 메인 차트: 정산 요약 일별 ----------------------- */

// KST 지금
const _nowKST = () => new Date(Date.now() + 9 * 3600 * 1000)

// Date -> 'YYYY-MM-DD'
const _fmtYmd = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// from~to(포함) 날짜 배열
const _rangeDays = (from, to) => {
  const out = []
  const s = new Date(`${from}T00:00:00+09:00`)
  const e = new Date(`${to}T00:00:00+09:00`)
  for (let d = s; d <= e; d = new Date(d.getTime() + 86400000)) {
    out.push(_fmtYmd(d))
  }
  return out
}

// 병렬 처리(동시 limit)
async function _pMapLimited(list, limit, worker) {
  const ret = new Array(list.length)
  let idx = 0
  const runners = new Array(Math.min(limit, list.length)).fill(0).map(async () => {
    while (idx < list.length) {
      const cur = idx++
      ret[cur] = await worker(list[cur], cur)
    }
  })
  await Promise.all(runners)
  return ret
}

// 단일 일자 요약: /api/seller/settlements/daily/summary?date=YYYY-MM-DD
async function _fetchDailySettlementSummary(date) {
  const { data, status } = await api.get('/api/seller/settlements/daily/summary', {
    params: { date },
    validateStatus: () => true,
  })
  // 실패(404 등)면 0 처리
  if (status < 200 || status >= 300) {
    return { date, ordersCount: 0, itemTotal: 0, payoutTotal: 0 }
  }
  return {
    date: data?.day || date,
    ordersCount: Number(data?.ordersCount ?? 0),
    itemTotal: Number(data?.itemTotal ?? 0),
    payoutTotal: Number(data?.payoutTotal ?? 0),
  }
}

/**
 * [EXPORT] 셀러 메인 그래프 데이터(최근 30일 기본)
 */
export async function fetchSellerMainStats({ from, to } = {}) {
  const _to = to || _fmtYmd(_nowKST())
  const _from = from || _fmtYmd(new Date(_nowKST().getTime() - 29 * 86400000))

  const days = _rangeDays(_from, _to)

  // 과호출 방지: 동시 6개
  const daily = await _pMapLimited(days, 6, _fetchDailySettlementSummary)

  // 순서 보정
  const rows = days.map(
    (d) => daily.find((x) => x.date === d) || { date: d, ordersCount: 0, itemTotal: 0, payoutTotal: 0 }
  )

  // 차트 포인트(MM/DD 라벨)
  const points = rows.map((r) => ({
    name: toMMDD(r.date),
    itemTotal: r.itemTotal,
    ordersCount: r.ordersCount,
    payoutTotal: r.payoutTotal,
  }))

  // 합계
  const summary = rows.reduce(
    (acc, r) => {
      acc.itemTotal += r.itemTotal
      acc.ordersCount += r.ordersCount
      acc.payoutTotal += r.payoutTotal
      return acc
    },
    { itemTotal: 0, ordersCount: 0, payoutTotal: 0 }
  )

  const metrics = [
    { key: 'itemTotal', label: '판매금액', unit: 'KRW', type: 'currency' },
    { key: 'ordersCount', label: '주문건수', unit: 'count', type: 'number' },
    { key: 'payoutTotal', label: '정산금액', unit: 'KRW', type: 'currency' },
  ]

  return {
    range: { from: _from, to: _to, interval: 'daily' },
    metrics,
    rows,
    points,
    summary,
  }
}

// 프론트 키 → 서버 enum
export const ORDER_STATUS_MAP = {
  ALL: null,
  READY: 'READY',
  SHIPPING: 'IN_TRANSIT',   // 🔴 기존 SHIPPING -> IN_TRANSIT 로 교체
  DELIVERED: 'DELIVERED',
  CONFIRMED: 'CONFIRMED',
  PENDING: 'PENDING',
  PAID: 'PAID',
}

// 그리드 조회 래퍼
export async function fetchSellerOrdersGrid({ statusKey='ALL', page=0, size=20, q, from, to } = {}) {
  const params = { page, size }
  const mapped = ORDER_STATUS_MAP[statusKey] ?? null
  if (mapped) params.status = mapped       // ALL이면 status 생략
  if (q) params.q = q
  if (from) params.from = from
  if (to) params.to = to

  const res = await api.get('/api/seller/orders/grid', {
    params,
    validateStatus: () => true,            // 4xx/5xx throw 금지
  })
  if (res.status < 200 || res.status >= 300) throw new Error(`orders/grid ${res.status}`)
  return res.data
}

