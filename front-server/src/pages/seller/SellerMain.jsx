// /src/pages/seller/SellerMain.jsx
// /src/pages/seller/SellerMain.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '/src/components/common/Button'
import StoreSalesStats from '/src/components/seller/charts/StoreSalesStats'
import { fetchSellerOrders } from '/src/service/orderService'
import { getAmount as _getAmount } from '/src/util/orderUtils'
import api from '/src/config/axiosInstance'

const box = 'rounded-xl border bg-white p-4 shadow-sm'
const kpi = 'flex items-center justify-between py-2 text-sm'

// 금액 추출 유틸 (orderUtils.getAmount 우선, 폴백 마련)
const getAmount = (row) => {
  try { return Number(_getAmount?.(row) ?? 0) } catch { /* noop */ }
  return Number(row?.payAmount ?? row?.amount ?? row?.totalAmount ?? 0)
}

// 상태 정규화 (서버 enum/한글 혼용 대응)
const normStatus = (s) => {
  if (!s) return ''
  const u = String(s).toUpperCase()
  if (u.includes('READY') || u.includes('PREPAR') || u.includes('발송') || u.includes('배송준비')) return 'READY'
  if (u.includes('SHIP') || u.includes('배송중')) return 'SHIPPING'
  if (u.includes('DELIVER') || u.includes('배송완료')) return 'DELIVERED'
  return u
}

// 구매확정 여부 추정
const isPurchaseConfirmed = (r) => {
  const u = String(r?.status || r?.orderStatus || '').toUpperCase()
  return u.includes('PURCHASE_CONF') || r?.purchaseConfirmed === true
}

export default function SellerMain() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  // ── 상품문의 상태
  const [inq, setInq] = useState([])
  const [inqLoading, setInqLoading] = useState(false)
  const [inqErr, setInqErr] = useState(null)

  const maskName = (name) => {
    if (!name) return '고객'
    const s = String(name)
    return s.length > 1 ? `${s[0]}**` : `${s}**`
  }
  const normalizeThread = (t) => {
    const id = t?.id || t?.roomId || t?.chatId || t?.threadId || t?.conversationId
    const buyerName = t?.buyerName || t?.customerName || t?.userName || t?.buyer?.name
    const productName = t?.productName || t?.product?.name
    const lastMessage = t?.lastMessage || t?.lastMsg || t?.lastContent || t?.last_message
    const unread = t?.unread ?? t?.unreadCount ?? t?.unread_count ?? 0
    const updatedAt = t?.updatedAt || t?.lastMessageAt || t?.updated_at || t?.lastAt
    return { id, buyer: maskName(buyerName), product: productName || '', lastMessage: lastMessage || '', unread: Number(unread || 0), updatedAt }
  }

  // 최근 14일 범위(차트와 동일 기준)
  const today = new Date()
  const start = new Date(today.getTime() - 13 * 86400000)
  const ymd = (d) => {
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

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
  }, [])

  // 상품문의 로드 (API 미확정: 후보 경로 순차 시도, 404/405는 스킵 → 빈 목록 유지)
  useEffect(() => {
    const loadInquiries = async () => {
      setInqLoading(true)
      setInqErr(null)
      try {
        const candidates = [
          '/api/seller/inquiries',
          '/api/seller/chats/inquiries',
          '/api/seller/chats',
          '/api/me/chats',
        ]
        let list = []
        for (const path of candidates) {
          try {
            const { data } = await api.get(path, { params: { page: 0, size: 8 } })
            const arr = data?.content ?? data?.list ?? data?.items ?? data
            if (Array.isArray(arr)) { list = arr; break }
          } catch (e) {
            const st = e?.response?.status
            if (st === 404 || st === 405) continue
            throw e
          }
        }
        setInq(list.map(normalizeThread))
      } catch (e) {
        setInqErr(e)
      } finally {
        setInqLoading(false)
      }
    }
    loadInquiries()
  }, [])

  // 파생 집계
  const counts = useMemo(() => {
    const by = (fn) => rows.filter(fn).length
    return {
      newOrders: by((o) => normStatus(o?.status || o?.orderStatus) === 'READY'),
      shipReady: by((o) => normStatus(o?.status || o?.orderStatus) === 'READY'),
      shipping: by((o) => normStatus(o?.status || o?.orderStatus) === 'SHIPPING'),
      shipped: by((o) => normStatus(o?.status || o?.orderStatus) === 'DELIVERED'),
      exchange: by((o) => (o?.exchangeRequested === true) ||
                          String(o?.status || o?.orderStatus || '').toUpperCase().includes('EXCHANGE')),
      returns:  by((o) => (o?.returnRequested === true) ||
                          String(o?.status || o?.orderStatus || '').toUpperCase().includes('RETURN')),
      cancels:  by((o) => (o?.cancelRequested === true) ||
                          String(o?.status || o?.orderStatus || '').toUpperCase().includes('CANCEL')),
      newFeedbacks: by((o) => (o?.feedbackSubmitted && !o?.feedbackReviewed) || false),
      purchaseConfirmed: by((o) => isPurchaseConfirmed(o)),
    }
  }, [rows])

  const settlement = useMemo(() => {
    const feeRate = 0.03
    const writerFee = 2000
    const delivered = rows.filter((o) => normStatus(o?.status || o?.orderStatus) === 'DELIVERED')
    const sales = delivered.reduce((s, o) => s + getAmount(o), 0)
    const fee = Math.round(sales * feeRate)
    const holdWriterFees = delivered.length * writerFee
    const net = sales - fee - holdWriterFees
    return { sales, fee, feeRate, writerFee, deliveredCount: delivered.length, net }
  }, [rows])

  const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : n)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 상단 요약: 주문 / 배송 / 정산 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 주문 */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">주문</h2>
          <Button
            variant="admin"
            className="w-full justify-between"
            onClick={() => navigate('/seller/orders')}
            disabled={loading}
          >
            <span className={kpi}>신규주문</span>
            <strong>{fmt(counts.newOrders)}건</strong>
          </Button>
          <Button
            variant="admin"
            className="mt-1 w-full justify-between"
            onClick={() => navigate('/seller/orders?tab=exchange')}
            disabled={loading}
          >
            <span className={kpi}>교환요청</span>
            <strong>{fmt(counts.exchange)}건</strong>
          </Button>
          <Button
            variant="admin"
            className="mt-1 w-full justify-between"
            onClick={() => navigate('/seller/feedbacks')}
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
            onClick={() => navigate('/seller/orders?tab=ready')}
            disabled={loading}
          >
            <span className={kpi}>배송준비</span>
            <strong>{fmt(counts.shipReady)}건</strong>
          </Button>
          <Button
            variant="admin"
            className="mt-1 w-full justify-between"
            onClick={() => navigate('/seller/orders?tab=shipping')}
            disabled={loading}
          >
            <span className={kpi}>배송중</span>
            <strong>{fmt(counts.shipping)}건</strong>
          </Button>
          <Button
            variant="admin"
            className="mt-1 w-full justify-between"
            onClick={() => navigate('/seller/orders?tab=delivered')}
            disabled={loading}
          >
            <span className={kpi}>배송완료</span>
            <strong>{fmt(counts.shipped)}건</strong>
          </Button>
        </section>

        {/* 정산 */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">정산</h2>
          <div className={kpi}>
            <span>정산예정</span>
            {err ? (
              <strong className="text-red-500">조회 실패</strong>
            ) : (
              <strong className="text-lg">{fmt(settlement.net)}원</strong>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500" />
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

      {/* 중간: 좌(그래프) — 우(상품문의/톡톡) */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 그래프(백 연동, 더미 없음) */}
        <StoreSalesStats className="md:col-span-2" from={ymd(start)} to={ymd(today)} />

        {/* 상품문의/톡톡 */}
        <section className={box}>
          <h2 className="mb-2 text-base font-semibold">상품문의</h2>

          {/* 고정 높이: 목록이 있어도/없어도 동일 */}
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
                      onClick={() => navigate('/user/chat', { state: { roomId: t.id, ctx: 'seller' } })}
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

      {/* 하단 여백 */}
      <div className="h-8" />
    </div>
  )
}
