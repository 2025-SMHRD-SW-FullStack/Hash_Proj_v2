// /src/service/statsService.js
import api from '../config/axiosInstance'
import { fetchSellerOrders, ORDER_STATUS_MAP } from '../service/orderService'
import { fetchSellerFeedbackGrid } from '../service/feedbackService'
import { getAmount as _getAmount } from '../util/orderUtils' // ✅ 금액 파싱 강화

/* ----------------------- 공통 유틸 ----------------------- */

// Date → YYYY-MM-DD
const ymd = (d) => {
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

// YYYY-MM-DD → Date
const toDate = (ymdStr) => {
  if (!ymdStr) return null
  const d = new Date(ymdStr + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

// YYYY-MM-DD -> MM/DD
const toMMDD = (ymdStr) => {
  if (!ymdStr) return ''
  const [y, m, d] = String(ymdStr).split('-')
  return `${m}/${d}`
}

// 날짜 해석 (여러 형식 지원)
const resolveDate = (row) => {
  // ✅ 그리드에서 실제로 자주 쓰는 키들을 넓게 커버
  const candidates = [
    row?.orderDate, row?.orderedAt, row?.orderAt,            // 주문일
    row?.paidAt, row?.paymentAt, row?.paymentDate,           // 결제일
    row?.createdAt, row?.createdDate,                        // 생성일
    row?.orderTime,                                          // 기타
  ]
  for (const v of candidates) {
    if (!v) continue
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) return ymd(d)
  }
  return null
}

// 금액 해석 (여러 필드명 지원)
// ✅ orderUtils.getAmount 우선 사용 → "352,000원" 같은 문자열·중첩 구조 모두 커버
const resolveAmount = (row) => {
  try {
    const n = _getAmount?.(row)
    if (Number.isFinite(n)) return n
  } catch (_) {}
  // 폴백: 흔한 키들만 숫자 추출
  const keys = ['payAmount', 'totalAmount', 'amount', 'price']
  for (const k of keys) {
    const v = row?.[k]
    const n = typeof v === 'string' ? Number(v.replace(/[^\d.-]/g, '')) : Number(v)
    if (Number.isFinite(n)) return n
  }
  return 0
}

// 현재 한국 시간 기준 YYYY-MM-DD
const _nowKST = () => {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return ymd(kst)
}

// 날짜 범위 생성 (from ~ to)
const _fmtYmd = (d) => {
  if (d instanceof Date) return ymd(d)
  if (typeof d === 'string') return d
  return ymd(new Date())
}

/* ----------------------- 대시보드 메인 카운트 ----------------------- */
/** 셀러 메인: 신규주문/교환요청/신규 피드백 카운트 */
export async function fetchDashboardCounts() {
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

  try {
    const [newOrdersRes, exchReqRes, newFbRes] = await Promise.all([
      fetchSellerOrders({ status: 'PAID', page: 0, size: 1 }).catch(() => ({ content: [] })),
      fetchSellerOrders({ status: 'EXCHANGE_REQUESTED', page: 0, size: 1 }).catch(() => ({ content: [] })),
      fetchSellerFeedbackGrid({ status: 'NEW_WRITE', page: 0, size: 1 }).catch(() => ({ content: [] })),
    ])

    return {
      newOrders: extractTotal(newOrdersRes),
      exchangeRequests: extractTotal(exchReqRes),
      newFeedbacks: extractTotal(newFbRes),
    }
  } catch (error) {
    console.error('대시보드 카운트 로드 실패:', error)
    return {
      newOrders: 0,
      exchangeRequests: 0,
      newFeedbacks: 0,
    }
  }
}

/* ----------------------- 주문 통계 ----------------------- */

/**
 * 주문 상태별 개수 집계
 * - 백엔드: /api/seller/orders/grid 사용
 * - 상태: PENDING, PAID, READY, IN_TRANSIT, DELIVERED, CONFIRMED
 */
export async function fetchOrderStatusCounts({ from, to } = {}) {
  try {
    const res = await fetchSellerOrders({ from, to, size: 1000 })
    const rows = res?.content || res?.list || res || []
    
    const counts = {
      PENDING: 0,
      PAID: 0,
      READY: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
      CONFIRMED: 0,
    }
    
    for (const row of rows) {
      const status = row?.status || row?.orderStatus
      if (status && counts.hasOwnProperty(status)) {
        counts[status]++
      }
    }
    
    const all = Object.values(counts).reduce((sum, count) => sum + count, 0)
    
    return { ...counts, ALL: all }
  } catch (error) {
    console.error('주문 상태별 개수 집계 실패:', error)
    return {
      PENDING: 0,
      PAID: 0,
      READY: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
      CONFIRMED: 0,
      ALL: 0
    }
  }
}

/* ----------------------- 매출 통계 ----------------------- */
/**
 * 매출 통계: /api/seller/orders/grid 결과를 날짜별로 합산
 * ✅ zero-fill: from~to 기간의 모든 날짜를 0으로 채워 반환
 * ✅ 보강: 주문 그리드 집계 금액이 전부 0인데 건수는 있을 때,
 *         일자별 정산 요약(/api/seller/settlements/daily/summary)으로 금액/건수를 보강
 */
export const fetchSalesStats = async ({ from, to } = {}) => {
  // 주문목록 집계
  let rows
  try {
    const res = await fetchSellerOrders?.({ from, to, size: 1000 })
    rows = res?.content || res?.list || res || []
  } catch (e) {
    console.warn('주문 통계 로드 실패, 폴백 시도:', e)
    // 폴백: 옛날 호환용 /api/seller/orders (있을 수도)
    try {
      const { data, status } = await api.get('/api/seller/orders', {
        params: { from, to, size: 1000 },
        validateStatus: () => true,
      })
      if (status >= 200 && status < 300) {
        rows = data?.content || data?.list || data || []
      } else {
        throw new Error(`API 호출 실패: ${status}`)
      }
    } catch (fallbackError) {
      console.error('폴백 API도 실패:', fallbackError)
      rows = []
    }
  }

  // 1) 날짜별로 Map에 누적
  const byDate = new Map()
  for (const r of rows) {
    const dYmd = resolveDate(r)
    if (!dYmd) continue
    const key = dYmd
    const existing =
      byDate.get(key) || { date: toMMDD(key), amount: 0, orders: 0, payersSet: new Set() }
    existing.amount += Number(resolveAmount(r) || 0) // 강화된 금액 파싱 사용
    existing.orders += 1
    const buyer = r?.buyerId || r?.memberId || r?.userId || r?.buyer?.id || r?.customerId
    if (buyer) existing.payersSet.add(buyer)
    byDate.set(key, existing)
  }

  // 2) ✅ zero-fill: from~to 전체 날짜 생성 후 Map 값으로 덮어쓰기
  const start = toDate(from) || new Date(new Date().setDate(new Date().getDate() - 13))
  const end   = toDate(to)   || new Date()
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  const dateRange = []
  const result = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = ymd(d)
    dateRange.push(key)
    const mmdd = toMMDD(key)
    const existing = byDate.get(key)
    if (existing) {
      result.push({
        date: existing.date,              // 'MM/DD'
        amount: existing.amount,
        orders: existing.orders,
        payers: existing.payersSet.size,
      })
    } else {
      result.push({
        date: mmdd,                       // 'MM/DD'
        amount: 0,
        orders: 0,
        payers: 0,
      })
    }
  }

  // 3) ✅ 보강: 금액 합계가 0인데(=파싱 실패 가능성) 주문 건수는 있으면 정산 요약으로 보강
  const amountSum = result.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const orderSum  = result.reduce((s, r) => s + (Number(r.orders) || 0), 0)

  if (amountSum === 0 && orderSum > 0) {
    try {
      const summaries = await _pMapLimited(dateRange, 5, _fetchDailySettlementSummary)
      const map = new Map(summaries.map(s => [s.date, s]))
      for (let i = 0; i < result.length; i++) {
        const key = dateRange[i]
        const s = map.get(key)
        if (!s) continue
        // itemTotal = 판매금액, ordersCount = 결제건수
        result[i].amount = Number(s.itemTotal ?? result[i].amount ?? 0)
        result[i].orders = Math.max(Number(result[i].orders ?? 0), Number(s.ordersCount ?? 0))
      }
    } catch (e) {
      console.warn('정산 요약 보강 실패:', e)
    }
  }

  return result
}


/* ----------------------- 보조 요약(선택) ----------------------- */
export async function fetchOrdersSummary({ from, to } = {}) {
  try {
    const res = await fetchSellerOrders({ from, to, size: 1000 })
    const rows = res?.content || res?.list || res || []
    
    const summary = {
      totalOrders: rows.length,
      totalAmount: 0,
      avgAmount: 0,
      statusBreakdown: {},
    }
    
    for (const row of rows) {
      const amount = resolveAmount(row)
      summary.totalAmount += amount
      
      const status = row?.status || row?.orderStatus || 'UNKNOWN'
      summary.statusBreakdown[status] = (summary.statusBreakdown[status] || 0) + 1
    }
    
    summary.avgAmount = summary.totalOrders > 0 ? Math.round(summary.totalAmount / summary.totalOrders) : 0
    
    return summary
  } catch (error) {
    console.error('주문 요약 로드 실패:', error)
    return {
      totalOrders: 0,
      totalAmount: 0,
      avgAmount: 0,
      statusBreakdown: {},
    }
  }
}

/* ----------------------- 메인 차트: 정산 요약 일별 ----------------------- */

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
  try {
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
  } catch (error) {
    console.warn(`일별 정산 요약 로드 실패 (${date}):`, error)
    return { date, ordersCount: 0, itemTotal: 0, payoutTotal: 0 }
  }
}

/**
 * [EXPORT] 셀러 메인 그래프 데이터(최근 30일 기본)
 */
export async function fetchSellerMainStats({ from, to } = {}) {
  try {
    const _to = to || _fmtYmd(_nowKST())
    const baseTo = toDate(_to)
    const _from = from || _fmtYmd(new Date(baseTo.getTime() - 29 * 86400000))
    
    // 1) 주문 통계 (그리드 API)
    let rows = []
    try {
      rows = await fetchSellerOrders({ from: _from, to: _to, size: 1000 })
      rows = rows?.content || rows?.list || rows || []
    } catch (e) {
      console.warn('주문 통계 로드 실패:', e)
      rows = []
    }
    
    // 2) 피드백 통계 (피드백 그리드 API)
    let points = []
    try {
      points = await fetchSellerFeedbackGrid({ from: _from, to: _to, size: 1000 })
      points = points?.content || points?.list || points || []
    } catch (e) {
      console.warn('피드백 통계 로드 실패:', e)
      points = []
    }
    
    // 3) 일별 정산 요약 (병렬 처리)
    const dateRange = []
    const fromDate = toDate(_from)
    const toDateValue = toDate(_to)
    
    if (fromDate && toDateValue) {
      for (let d = new Date(fromDate); d <= toDateValue; d.setDate(d.getDate() + 1)) {
        dateRange.push(ymd(d))
      }
    }
    
    let summary = []
    try {
      summary = await _pMapLimited(
        dateRange,
        5, // 동시 5개 요청으로 제한
        _fetchDailySettlementSummary
      )
    } catch (e) {
      console.warn('정산 요약 로드 실패:', e)
      // 기본 0값 데이터 생성
      summary = dateRange.map(date => ({
        date,
        ordersCount: 0,
        itemTotal: 0,
        payoutTotal: 0
      }))
    }
    
    return {
      from: _from,
      to: _to,
      rows,
      points,
      summary,
    }
  } catch (error) {
    console.error('fetchSellerMainStats 전체 실패:', error)
    
    // 에러 시에도 기본 데이터 반환
    const _to = to || _fmtYmd(_nowKST())
    const baseTo = toDate(_to)
    const _from = from || _fmtYmd(new Date(baseTo.getTime() - 29 * 86400000))
    
    // 기본 30일 데이터 생성
    const defaultData = []
    const fromDate = toDate(_from)
    const toDateValue = toDate(_to)
    
    if (fromDate && toDateValue) {
      for (let d = new Date(fromDate); d <= toDateValue; d.setDate(d.getDate() + 1)) {
        defaultData.push({
          date: ymd(d),
          ordersCount: 0,
          itemTotal: 0,
          payoutTotal: 0
        })
      }
    }
    
    return {
      from: _from,
      to: _to,
      rows: [],
      points: [],
      summary: defaultData,
    }
  }
}

// 그리드 조회 래퍼
export async function fetchSellerOrdersGrid({ statusKey='ALL', page=0, size=20, q, from, to } = {}) {
  try {
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
  } catch (error) {
    console.error('주문 그리드 조회 실패:', error)
    throw error
  }
}

/* ----------------------- 신규: 셀러 대시보드 통계 API ----------------------- */
/**
 * 셀러 대시보드 통계 (백엔드 API 비활성 → 폴백만 사용)
 * - 예전처럼 orders/grid 기반 집계만 사용하여 404 로그 제거
 */
export async function fetchSellerDashboardStats(targetDate = null) {
  return await fetchDashboardCountsFallback()
}

/**
 * 폴백: 기존 방식으로 대시보드 카운트 계산
 */
async function fetchDashboardCountsFallback() {
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

  try {
    const [newOrdersRes, exchReqRes, newFbRes] = await Promise.all([
      fetchSellerOrders({ status: 'PAID', page: 0, size: 1 }).catch(() => ({ content: [] })),
      fetchSellerOrders({ status: 'EXCHANGE_REQUESTED', page: 0, size: 1 }).catch(() => ({ content: [] })),
      fetchSellerFeedbackGrid({ status: 'NEW_WRITE', page: 0, size: 1 }).catch(() => ({ content: [] })),
    ])

    return {
      targetDate: new Date().toISOString().split('T')[0], // 오늘 날짜
      newOrders: extractTotal(newOrdersRes),
      newFeedbacks: extractTotal(newFbRes),
      shipReady: extractTotal(newOrdersRes), // READY 상태가 배송준비와 같음
      shipping: 0, // 폴백에서는 계산하지 않음
      shipped: 0,
      exchange: extractTotal(exchReqRes),
      returns: 0,
      cancels: 0,
      purchaseConfirmed: 0
    }
  } catch (error) {
    console.error('대시보드 카운트 폴백도 실패:', error)
    return {
      targetDate: new Date().toISOString().split('T')[0],
      newOrders: 0,
      newFeedbacks: 0,
      shipReady: 0,
      shipping: 0,
      shipped: 0,
      exchange: 0,
      returns: 0,
      cancels: 0,
      purchaseConfirmed: 0
    }
  }
}
