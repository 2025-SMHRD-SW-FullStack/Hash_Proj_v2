// /src/pages/seller/SellerMain.jsx
import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import StoreSalesStats from '../../components/seller/charts/StoreSalesStats'

import { listRooms, markRead, listMessages } from '../../service/chatService'
import { fetchSellerOrders } from '../../service/orderService'
import { fetchSellerDashboardStats } from '../../service/statsService'
import { getAmount as _getAmount } from '../../util/orderUtils'
import { fetchDailySettlementSummary } from '../../service/settlementService'
import { useOrderStore } from '../../stores/orderStore'
import useAuthStore from '../../stores/authStore'
import chatSocket from '../../service/chatSocket'   // ✅ 실시간 갱신용

const box = 'rounded-xl border bg-white p-4 shadow-sm'
const kpi = 'flex items-center justify-between py-2 text-sm'

// 금액 추출 유틸 (orderUtils.getAmount 우선, 폴백)
const getAmount = (row) => {
  try { return Number(_getAmount?.(row) ?? 0) } catch { /* noop */ }
  return Number(row?.payAmount ?? row?.amount ?? row?.totalAmount ?? 0)
}

// 백엔드 OrderStatus enum 기반 상태 정규화
const normStatus = (s) => {
  if (!s) return ''
  const u = String(s).toUpperCase()
  if (['PENDING', 'PAID', 'READY', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED'].includes(u)) return u
  if (u.includes('신규') || u.includes('결제완료') || u.includes('배송준비')) return 'READY'
  if (u.includes('교환')) return 'EXCHANGE'
  if (u.includes('반품')) return 'RETURN'
  if (u.includes('취소')) return 'CANCEL'
  if (u.includes('준비') || u.includes('발송')) return 'READY'
  if (u.includes('배송중') || u.includes('운송중')) return 'IN_TRANSIT'
  if (u.includes('배송완료') || u.includes('완료')) return 'DELIVERED'
  if (u.includes('구매확정') || u.includes('확정')) return 'CONFIRMED'
  return u
}
const isPurchaseConfirmed = (r) => {
  const status = normStatus(r?.status || r?.orderStatus)
  return status === 'CONFIRMED' || r?.purchaseConfirmed === true
}
const ymd = (d) => {
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : (n ?? '0'))

export default function SellerMain() {
  const navigate = useNavigate()
  const me = useAuthStore(s => s.user)

  // 전역 주문 상태 구독
  const {
    orders: globalOrders,
    stats: globalStats,
    lastUpdated: globalLastUpdated,
    needsRefresh: globalNeedsRefresh,
    setOrders: setGlobalOrders,
  } = useOrderStore()

  // 주문
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  // 상품문의(채팅 스레드)
  const [inq, setInq] = useState([])
  const [inqLoading, setInqLoading] = useState(false)
  const [inqErr, setInqErr] = useState(null)

  // 정산 요약(오늘)
  const [settleSummary, setSettleSummary] = useState(null)
  const [settleLoading, setSettleLoading] = useState(false)
  const [settleErr, setSettleErr] = useState(null)

  // 최근 14일 범위(차트와 동일 기준)
  const today = new Date()
  const start = new Date(today.getTime() - 13 * 86400000)
  const todayYmd = ymd(today)

  // 주문 목록 로드 (전역 상태와 동기화)
  useEffect(() => {
    const run = async () => {
      if (globalOrders.length > 0 && !globalNeedsRefresh()) {
        setRows(globalOrders); setLoading(false); setErr(null); return
      }
      setLoading(true); setErr(null)
      try {
        const res = await fetchSellerOrders({ from: ymd(start), to: ymd(today), size: 500 })
        const list = res?.content ?? res?.list ?? res ?? []
        const orderList = Array.isArray(list) ? list : []
        setRows(orderList)
        if (orderList.length > 0) setGlobalOrders(orderList)
      } catch (e) {
        console.warn('주문 목록 로드 실패:', e)
        setRows([]); setErr(e)
      } finally { setLoading(false) }
    }
    run()
  }, [globalOrders, globalLastUpdated, globalNeedsRefresh, setGlobalOrders])

  // 전역 주문 상태 변경 감지하여 로컬 상태 동기화
  useEffect(() => { if (globalOrders.length > 0) setRows(globalOrders) }, [globalOrders])

  // ─────────────────────────────────────────────
  // 상품문의(채팅방) 로드 & 실시간 갱신
  // ─────────────────────────────────────────────

  const buildInquiryRows = useCallback(async (rooms) => {
    const arr = Array.isArray(rooms) ? rooms : (rooms?.content ?? rooms?.rows ?? [])
    // 서버가 내려주는 lastMessagePreview / lastMessageTime / unreadCount를 우선 사용
    // 필요 시 마지막 메시지 안전 확보를 위해 1건만 조회
    const withLast = await Promise.all(
      arr.map(async (r) => {
        const id = r.roomId ?? r.id
        const base = {
          id,
          sender: r.other?.nickname || '고객',
          product: r.product?.name || r.productName || '',
          lastMessage: r.lastMessagePreview || '',
          unread: Number(r.unreadCount ?? r.unread ?? 0),
          updatedAt: r.lastMessageTime ?? r.updatedAt,
        }
        if (!base.lastMessage) {
          try {
            const msgs = await listMessages(id, null, 1) // 백엔드가 최신 1개 반환(ASC/DSC 무관)
            if (Array.isArray(msgs) && msgs.length > 0) {
              base.lastMessage = msgs[msgs.length - 1]?.content || base.lastMessage
            }
          } catch {}
        }
        return base
      })
    )
    // 최신순 정렬
    withLast.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    return withLast
  }, [])

  const loadInquiries = useCallback(async () => {
    setInqLoading(true); setInqErr(null)
    try {
      const rooms = await listRooms('seller')
      const data = await buildInquiryRows(rooms)
      setInq(data)
    } catch (e) {
      console.warn('상품문의 로드 실패:', e)
      setInq([]); setInqErr(e)
    } finally {
      setInqLoading(false)
    }
  }, [buildInquiryRows])

  // 최초 로드
  useEffect(() => { loadInquiries() }, [loadInquiries])

  // ✅ 실시간: ROOM_UPDATED 수신 시 다시 로드
  useEffect(() => {
    if (!me?.id) return
    let unsub = () => {}
    chatSocket.connect(() => {
      unsub = chatSocket.subscribeUserRoomEvents(me.id, (evt) => {
        if (evt?.type === 'ROOM_UPDATED') loadInquiries()
      })
    })
    return () => { try { unsub() } catch {} }
  }, [me?.id, loadInquiries])

  // 오늘자 정산 요약 로드 (백엔드 공식 값)
  useEffect(() => {
    let alive = true
    ;(async () => {
      setSettleLoading(true); setSettleErr(null)
      try {
        const s = await fetchDailySettlementSummary(todayYmd)
        if (alive) setSettleSummary(s)
      } catch (e) {
        if (alive) { console.warn('정산 요약 로드 실패:', e); setSettleSummary(null); setSettleErr(e) }
      } finally { if (alive) setSettleLoading(false) }
    })()
    return () => { alive = false }
  }, [todayYmd])

  // 대시보드 통계
  const [dashboardStats, setDashboardStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsErr, setStatsErr] = useState(null)

  useEffect(() => {
    const loadDashboardStats = async () => {
      setStatsLoading(true); setStatsErr(null)
      try {
        const stats = await fetchSellerDashboardStats()
        setDashboardStats(stats)
      } catch (e) {
        console.warn('대시보드 통계 로드 실패:', e)
        setStatsErr(e)
        setDashboardStats(await calculateFallbackStats())
      } finally { setStatsLoading(false) }
    }
    loadDashboardStats()
  }, []) // eslint-disable-line

  const calculateFallbackStats = async () => {
    const by = (fn) => rows.filter(fn).length
    return {
      targetDate: new Date().toISOString().split('T')[0],
      newOrders: by((o) => normStatus(o?.status || o?.orderStatus) === 'READY'),
      shipReady: by((o) => normStatus(o?.status || o?.orderStatus) === 'READY'),
      shipping: by((o) => normStatus(o?.status || o?.orderStatus) === 'IN_TRANSIT'),
      shipped: by((o) => normStatus(o?.status || o?.orderStatus) === 'DELIVERED'),
      exchange: by((o) => (o?.exchangeRequested === true) || normStatus(o?.status || o?.orderStatus) === 'EXCHANGE'),
      returns: by((o) => (o?.returnRequested === true) || normStatus(o?.status || o?.orderStatus) === 'RETURN'),
      cancels: by((o) => (o?.cancelRequested === true) || normStatus(o?.status || o?.orderStatus) === 'CANCEL'),
      newFeedbacks: by((o) => (o?.feedbackSubmitted && !o?.feedbackReviewed) || false),
      purchaseConfirmed: by((o) => isPurchaseConfirmed(o)),
    }
  }

  const counts = useMemo(() => {
    if (dashboardStats) {
      return {
        newOrders: dashboardStats.newOrders,
        shipReady: dashboardStats.shipReady,
        shipping: dashboardStats.shipping,
        shipped: dashboardStats.shipped,
        exchange: dashboardStats.exchange,
        returns: dashboardStats.returns,
        cancels: dashboardStats.cancels,
        newFeedbacks: dashboardStats.newFeedbacks,
        purchaseConfirmed: dashboardStats.purchaseConfirmed,
      }
    }
    if (globalStats && Object.values(globalStats).some(v => v > 0)) return globalStats
    const by = (fn) => rows.filter(fn).length
    return {
      newOrders: by((o) => normStatus(o?.status || o?.orderStatus) === 'READY'),
      shipReady: by((o) => normStatus(o?.status || o?.orderStatus) === 'READY'),
      shipping: by((o) => normStatus(o?.status || o?.orderStatus) === 'IN_TRANSIT'),
      shipped: by((o) => normStatus(o?.status || o?.orderStatus) === 'DELIVERED'),
      exchange: by((o) => (o?.exchangeRequested === true) || normStatus(o?.status || o?.orderStatus) === 'EXCHANGE'),
      returns: by((o) => (o?.returnRequested === true) || normStatus(o?.status || o?.orderStatus) === 'RETURN'),
      cancels: by((o) => (o?.cancelRequested === true) || normStatus(o?.status || o?.orderStatus) === 'CANCEL'),
      newFeedbacks: by((o) => (o?.feedbackSubmitted && !o?.feedbackReviewed) || false),
      purchaseConfirmed: by((o) => isPurchaseConfirmed(o)),
    }
  }, [dashboardStats, globalStats, rows])

  // 폴백 정산
  const fallbackSettlement = useMemo(() => {
    const feeRate = 0.03
    const writerFee = 2000
    const delivered = rows.filter((o) => normStatus(o?.status || o?.orderStatus) === 'DELIVERED')
    const sales = delivered.reduce((s, o) => s + getAmount(o), 0)
    const fee = Math.round(sales * feeRate)
    const holdWriterFees = delivered.length * writerFee
    const net = sales - fee - holdWriterFees
    return { sales, fee, feedbackTotal: holdWriterFees, payoutTotal: net }
  }, [rows])

  const summaryView = useMemo(() => {
    const s = settleSummary
    if (s && typeof s === 'object') {
      return {
        itemTotal: Number(s.itemTotal || 0),
        platformFee: Number(s.platformFee || 0),
        feedbackTotal: Number(s.feedbackTotal || 0),
        payoutTotal: Number(s.payoutTotal || 0),
      }
    }
    return {
        itemTotal: Number(fallbackSettlement.sales || 0),
        platformFee: Number(fallbackSettlement.fee || 0),
        feedbackTotal: Number(fallbackSettlement.feedbackTotal || 0),
        payoutTotal: Number(fallbackSettlement.payoutTotal || 0),
    }
  }, [settleSummary, fallbackSettlement])

  return (
    <div className="mx-auto w-full max-w-7xl lg:px-8">
      {/* 상단 제목 */}
      <div className="mb-4">
        <h1 className="text-xl font-bold">셀러 대시보드</h1>
        {statsErr && <p className="mt-1 text-sm text-red-600">⚠️ 통계 로드 실패 (기본값 표시)</p>}
      </div>

      {/* 상단 요약 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 주문 */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">주문</h2>
          <Button
            variant="admin"
            className="w-full justify-between"
            onClick={() => navigate('/seller/orders?status=READY')}
            disabled={loading || statsLoading}
          >
            <span className={kpi}>신규주문</span>
            <strong>{statsLoading ? '...' : fmt(counts.newOrders)}건</strong>
          </Button>

          <Button
            variant="admin"
            className="mt-1 w-full justify-between"
            onClick={() => navigate('/seller/exchanges/pending')}
            disabled={loading}
          >
            <span className={kpi}>교환요청</span>
            <strong>0건</strong>
          </Button>

          <Button
            variant="admin"
            className="mt-1 w-full justify-between"
            onClick={() => navigate('/seller/feedbacks/manage?status=NEW_WRITE')}
            disabled={loading || statsLoading}
          >
            <span className={kpi}>신규 피드백</span>
            <strong>{statsLoading ? '...' : fmt(counts.newFeedbacks)}건</strong>
          </Button>
        </section>

        {/* 배송 */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">배송</h2>
          <Button variant="admin" className="w-full justify-between" onClick={() => navigate('/seller/orders?status=READY')} disabled={loading}>
            <span className={kpi}>배송준비</span>
            <strong>{fmt(counts.shipReady)}건</strong>
          </Button>
          <Button variant="admin" className="mt-1 w-full justify-between" onClick={() => navigate('/seller/orders?status=IN_TRANSIT')} disabled={loading}>
            <span className={kpi}>배송중</span>
            <strong>{fmt(counts.shipping)}건</strong>
          </Button>
          <Button variant="admin" className="mt-1 w-full justify-between" onClick={() => navigate('/seller/orders?status=DELIVERED')} disabled={loading}>
            <span className={kpi}>배송완료</span>
            <strong>{fmt(counts.shipped)}건</strong>
          </Button>
        </section>

        {/* 정산 (오늘자) */}
        <section className={box}>
          <div className="mt-2 rounded-lg border bg-gray-50">
            {settleLoading ? (
              <div className="p-3 text-center text-xs text-gray-500">불러오는 중…</div>
            ) : settleErr ? (
              <div className="p-3 text-center text-xs text-gray-500">정산 요약을 불러오지 못했습니다. (기본값 표시)</div>
            ) : (
              <div>
                <li className="flex items-center justify-between p-3"><span>상품금액 합계</span><strong>{fmt(summaryView.itemTotal)}원</strong></li>
                <li className="flex items-center justify-between p-3"><span>플랫폼 수수료(3%)</span><strong>{fmt(summaryView.platformFee)}원</strong></li>
                <li className="flex items-center justify-between p-3"><span>피드백 원고료 합계</span><strong>{fmt(summaryView.feedbackTotal)}원</strong></li>
                <li className="flex items-center justify-between p-3"><span>정산 예정 합계</span><strong className="text-base">{fmt(summaryView.payoutTotal)}원</strong></li>
              </div>
            )}
          </div>
          <Button variant="admin" className="mt-3 w-full" onClick={() => navigate('/seller/payouts')} disabled={loading}>
            정산 내역 보기
          </Button>
        </section>
      </div>

      {/* 중간: 좌(그래프) — 우(상품문의) */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 그래프 */}
        <div className="md:col-span-2">
          {err ? (
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-center text-sm text-gray-500">차트 데이터를 불러오지 못했습니다. (주문 데이터 없음)</div>
            </div>
          ) : (
            <StoreSalesStats from={ymd(start)} to={ymd(today)} />
          )}
        </div>

        {/* 상품문의 */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">상품문의</h2>

          {inqLoading ? (
            <div className="h-[220px] rounded-md border p-4 text-sm text-gray-500">로딩 중…</div>
          ) : inqErr ? (
            <div className="h-[220px] rounded-md border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
              문의 목록을 불러오지 못했습니다. (기본값 표시)
            </div>
          ) : inq.length === 0 ? (
            <div className="h-[220px] rounded-md border border-dashed p-4 text-center text-sm text-gray-500">
              문의가 없습니다.
            </div>
          ) : (
            <div className="h-[220px] overflow-auto rounded-md border">
              <ul className="m-0 list-none divide-y p-0">
                {inq.map((t) => (
                  <li key={t.id} className="p-2">
                    <Button
                      variant="admin"
                      className="w-full justify-start rounded-lg p-3 text-left"
                      onClick={async () => {
                        try { await markRead(t.id) } catch {}
                        // 읽음 즉시 UI 반영
                        setInq(prev => prev.map(x => x.id === t.id ? { ...x, unread: 0 } : x))
                        navigate(`/seller/chat/rooms/${t.id}`)
                      }}
                    >
                      <div className="flex w-full items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <strong className="text-gray-900">{t.sender}</strong>
                            {t.product && <span className="text-gray-500">· {t.product}</span>}
                          </div>
                          <div className="mt-0.5 line-clamp-1 text-[13px] text-gray-600">{t.lastMessage}</div>
                        </div>
                        <div className="ml-2 shrink-0">
                          {t.unread > 0 && (
                            <span className="inline-flex min-w-[20px] justify-center rounded-full bg-black px-2 py-0.5 text-[11px] font-medium text-white">
                              {t.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="admin" className="mt-3 w-full" onClick={() => navigate('/seller/chat')}>
            채팅 페이지로 이동
          </Button>
        </section>
      </div>
    </div>
  )
}
