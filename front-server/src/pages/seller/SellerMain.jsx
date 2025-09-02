// /src/pages/seller/SellerMain.jsx
import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '/src/components/common/Button'
import StoreSalesStats from '/src/components/seller/charts/StoreSalesStats'

import { listRooms, markRead } from '/src/service/chatService'
import { fetchSellerOrders } from '/src/service/orderService'
import { getAmount as _getAmount } from '/src/util/orderUtils'
import api from '/src/config/axiosInstance'
import { fetchDailySettlementSummary } from '/src/service/settlementService'

const box = 'rounded-xl border bg-white p-4 shadow-sm'
const kpi = 'flex items-center justify-between py-2 text-sm'

// 금액 추출 유틸 (orderUtils.getAmount 우선, 폴백)
const getAmount = (row) => {
  try { return Number(_getAmount?.(row) ?? 0) } catch { /* noop */ }
  return Number(row?.payAmount ?? row?.amount ?? row?.totalAmount ?? 0)
}

// 상태 정규화 (서버 enum/한글 혼용 대응)
const normStatus = (s) => {
  if (!s) return ''
  const u = String(s).toUpperCase()
  // 우선순위: 신규/교환/반품/취소 → 준비/배송중/완료
  if (u.includes('NEW') || u.includes('신규')) return 'NEW'
  if (u.includes('EXCHANGE') || u.includes('교환')) return 'EXCHANGE'
  if (u.includes('RETURN') || u.includes('반품')) return 'RETURN'
  if (u.includes('CANCEL') || u.includes('취소')) return 'CANCEL'
  if (u.includes('READY') || u.includes('PREPAR') || u.includes('발송') || u.includes('배송준비')) return 'READY'
  if (u.includes('SHIP') || u.includes('IN_TRANSIT') || u.includes('배송중')) return 'SHIPPING'
  if (u.includes('DELIVER') || u.includes('배송완료')) return 'DELIVERED'
  return u
}

// 구매확정 여부 추정
const isPurchaseConfirmed = (r) => {
  const u = String(r?.status || r?.orderStatus || '').toUpperCase()
  return u.includes('PURCHASE_CONF') || u.includes('CONFIRMED') || r?.purchaseConfirmed === true
}

// 날짜 유틸
const ymd = (d) => {
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : (n ?? '0'))

export default function SellerMain() {
  const navigate = useNavigate()

  // 주문 리스트 (최근 14일만 당겨서 집계)
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

  // 주문 목록 로드
  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErr(null)
      try {
        const res = await fetchSellerOrders({ from: ymd(start), to: ymd(today), size: 500 })
        const list = res?.content ?? res?.list ?? res ?? []
        setRows(Array.isArray(list) ? list : [])
      } catch (e) {
        setErr(e)
      } finally {
        setLoading(false)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // 상품문의(채팅방) 로드 – chatService 사용
  useEffect(() => {
    const maskName = (name) => {
      if (!name) return '고객'
      const s = String(name)
      return s.length > 1 ? `${s[0]}**` : `${s}**`
    }
    (async () => {
      setInqLoading(true); setInqErr(null)
      try {
        // 🔹 핵심: 판매자 시점으로 조회
        const rooms = await listRooms('seller')
        // 페이지/배열 응답 모두 대응
        const arr = Array.isArray(rooms) ? rooms : (rooms?.content ?? rooms?.rows ?? [])
        const norm = arr.map((r) => {
          const id = r.id ?? r.roomId
          const buyerName = r.buyerName ?? r.userName ?? r.customerName ?? r.peerName
          const productName = r.productName ?? r.product?.name
          const lastMessage = r.lastMessage ?? r.lastMsg ?? r.lastContent
          const unread = r.unread ?? r.unreadCount ?? 0
          const updatedAt = r.updatedAt ?? r.lastMessageAt
          return {
            id,
            buyer: maskName(buyerName),
            product: productName || '',
            lastMessage: lastMessage || '',
            unread: Number(unread || 0),
            updatedAt,
          }
        })
        setInq(norm)
      } catch (e) {
        setInqErr(e)
      } finally {
        setInqLoading(false)
      }
    })()
  }, [])

  // 오늘자 정산 요약 로드 (백엔드 공식 값)
  useEffect(() => {
    let alive = true
      ; (async () => {
        setSettleLoading(true)
        setSettleErr(null)
        try {
          const s = await fetchDailySettlementSummary(todayYmd)
          if (!alive) return
          setSettleSummary(s)
        } catch (e) {
          if (!alive) return
          setSettleErr(e)
        } finally {
          if (alive) setSettleLoading(false)
        }
      })()
    return () => { alive = false }
  }, [todayYmd])

  // 파생 집계(주문) — 백 요약 호출 실패 시 폴백 계산에 사용
  const counts = useMemo(() => {
    const by = (fn) => rows.filter(fn).length
    return {
      newOrders: by((o) => normStatus(o?.status || o?.orderStatus) === 'NEW'),
      shipReady: by((o) => normStatus(o?.status || o?.orderStatus) === 'READY'),
      shipping: by((o) => normStatus(o?.status || o?.orderStatus) === 'SHIPPING'),
      shipped: by((o) => normStatus(o?.status || o?.orderStatus) === 'DELIVERED'),
      exchange: by((o) => (o?.exchangeRequested === true) ||
        normStatus(o?.status || o?.orderStatus) === 'EXCHANGE'),
      returns: by((o) => (o?.returnRequested === true) ||
        normStatus(o?.status || o?.orderStatus) === 'RETURN'),
      cancels: by((o) => (o?.cancelRequested === true) ||
        normStatus(o?.status || o?.orderStatus) === 'CANCEL'),
      newFeedbacks: by((o) => (o?.feedbackSubmitted && !o?.feedbackReviewed) || false),
      purchaseConfirmed: by((o) => isPurchaseConfirmed(o)),
    }
  }, [rows])

  // 폴백 정산(배송완료 합산 - 수수료 - 원고료 홀딩) — 백 요약이 없을 때만 화면에 사용
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

  // 화면에 쓸 최종 정산 요약(백 값 우선, 없으면 폴백)
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
    // 폴백
    return {
      itemTotal: Number(fallbackSettlement.sales || 0),
      platformFee: Number(fallbackSettlement.fee || 0),
      feedbackTotal: Number(fallbackSettlement.feedbackTotal || 0),
      payoutTotal: Number(fallbackSettlement.payoutTotal || 0),
    }
  }, [settleSummary, fallbackSettlement])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 상단 요약 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 주문 */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">주문</h2>
          <Button
            variant="admin"
            className="w-full justify-between"
            onClick={() => navigate('/seller/orders?status=NEW')}
            disabled={loading}
          >
            <span className={kpi}>신규주문</span>
            <strong>{fmt(counts.newOrders)}건</strong>
          </Button>
          <Button
            variant="admin"
            className="mt-1 w-full justify-between"
            onClick={() => navigate('/seller/orders?status=EXCHANGE_REQUESTED')}
            disabled={loading}
          >
            <span className={kpi}>교환요청</span>
            <strong>{fmt(counts.exchange)}건</strong>
          </Button>
          <Button
            variant="admin"
            className="mt-1 w-full justify-between"
            onClick={() => navigate('/seller/feedbacks/manage?status=NEW_WRITE')}
            disabled={loading}
          >
            <span className={kpi}>신규 피드백</span>
            <strong>{fmt(counts.newFeedbacks)}건</strong>
          </Button>
        </section>

        {/* 배송 */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">배송</h2>
          <Button
            variant="admin"
            className="w-full justify-between"
            onClick={() => navigate('/seller/orders?status=READY')}
            disabled={loading}
          >
            <span className={kpi}>배송준비</span>
            <strong>{fmt(counts.shipReady)}건</strong>
          </Button>
          <Button
            variant="admin"
            className="mt-1 w-full justify-between"
            onClick={() => navigate('/seller/orders?status=SHIPPING')}
            disabled={loading}
          >
            <span className={kpi}>배송중</span>
            <strong>{fmt(counts.shipping)}건</strong>
          </Button>
          <Button
            variant="admin"
            className="mt-1 w-full justify-between"
            onClick={() => navigate('/seller/orders?status=DELIVERED')}
            disabled={loading}
          >
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
              <div className="p-3 text-center text-xs text-red-600">
                정산 요약을 불러오지 못했습니다.
              </div>
            ) : (
              <div>
                <li className="flex items-center justify-between p-3">
                  <span>상품금액 합계</span>
                  <strong>{fmt(summaryView.itemTotal)}원</strong>
                </li>
                <li className="flex items-center justify-between p-3">
                  <span>플랫폼 수수료(3%)</span>
                  <strong>{fmt(summaryView.platformFee)}원</strong>
                </li>
                <li className="flex items-center justify-between p-3">
                  <span>피드백 원고료 합계</span>
                  <strong>{fmt(summaryView.feedbackTotal)}원</strong>
                </li>
                <li className="flex items-center justify-between p-3">
                  <span>정산 예정 합계</span>
                  <strong className="text-base">{fmt(summaryView.payoutTotal)}원</strong>
                </li>
              </div>
            )}
          </div>

          <Button
            variant="admin"
            className="mt-3 w-full"
            onClick={() => navigate('/seller/payouts')}
            disabled={loading}
          >
            정산 내역 보기
          </Button>
        </section>
      </div>

      {/* 중간: 좌(그래프) — 우(상품문의) */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 그래프 */}
        <StoreSalesStats className="md:col-span-2" from={ymd(start)} to={ymd(today)} />

        {/* 상품문의 */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">상품문의</h2>

          {inqLoading ? (
            <div className="h-[220px] rounded-md border p-4 text-sm text-gray-500">로딩 중…</div>
          ) : inqErr ? (
            <div className="h-[220px] rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-600">
              문의 목록을 불러오지 못했습니다: {inqErr?.response?.data?.message || inqErr.message}
            </div>
          ) : inq.length === 0 ? (
            <div className="h-[220px] rounded-md border border-dashed p-4 text-center text-sm text-gray-500">
              문의가 없습니다.
            </div>
          ) : (
            <div className="h-[220px] overflow-auto rounded-md border">
              <ul className="divide-y">
                {inq.map((t) => (
                  <li key={t.id} className="p-2">
                    <Button
                      variant="admin"
                      className="w-full justify-start rounded-lg p-3 text-left"
                      onClick={async () => {
                        try { await markRead(t.id) } catch { }
                        navigate(`/seller/chat/rooms/${t.id}`)
                      }}
                    >
                      <div className="flex w-full items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <strong className="text-gray-900">{t.buyer}</strong>
                            {t.product && <span className="text-gray-500">· {t.product}</span>}
                          </div>
                          <div className="mt-0.5 line-clamp-1 text-[13px] text-gray-600">
                            {t.lastMessage || '메시지 없음'}
                          </div>
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

          <Button
            variant="admin"
            className="mt-3 w-full"
            onClick={() => navigate('/user/chat')}
          >
            채팅 페이지로 이동
          </Button>
        </section>
      </div>

      <div className="h-8" />
    </div>
  )
}
