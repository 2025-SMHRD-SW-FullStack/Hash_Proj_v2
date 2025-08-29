// /src/pages/seller/PayoutsPage.jsx
import { useEffect, useMemo, useState } from 'react'
import Modal from '/src/components/common/Modal'
import OrderDetailContent from '/src/components/seller/OrderDetailContent'
import { fetchSellerOrders } from '/src/service/orderService'

// ---- 정책 상수
const FEE_RATE = 0.03
const WRITER_FEE = 2000

// ---- UI 토큰
const box = 'rounded-xl border bg-white p-4 shadow-sm text-gray-900'
const badge = (cls) => `rounded-md px-2 py-1 text-[12px] ring-1 ${cls}`

// ---- 유틸
const startOfToday = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t }
const toDate = (s) => (s ? new Date(s + 'T00:00:00') : null)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : n)
const fmtDate = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '-'
const cut = (s = '', n = 20) => (s.length > n ? s.slice(0, n) + '…' : s)

// ---- 컬럼 폭
const COLW = { ORDER_ID: 100, PRODUCT: 300, DEADLINE: 100, PRICE: 120, FEE: 90, WRITER: 140, PAYOUT: 130, STATE: 95, NOTE: 100 }
const TABLE_MIN_W = Object.values(COLW).reduce((a, b) => a + b, 0)

// ---- 헤더 정의(공백 텍스트 노드 방지용)
const HEADERS = [
  { w: COLW.ORDER_ID, label: '주문번호' },
  { w: COLW.PRODUCT, label: '상품' },
  { w: COLW.DEADLINE, label: '피드백 마감일' },
  { w: COLW.PRICE, label: '결제금액' },
  { w: COLW.FEE, label: '수수료(3%)' },
  { w: COLW.WRITER, label: '원고료 상태' },
  { w: COLW.PAYOUT, label: '셀러 정산액' },
  { w: COLW.STATE, label: '정산 상태' },
  { w: COLW.NOTE, label: '비고' },
]

export default function PayoutsPage() {
  const [raw, setRaw] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detail, setDetail] = useState(null)

  const today0 = useMemo(() => startOfToday(), [])

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        const page = await fetchSellerOrders({ page: 0, size: 50 })
        const list = (page?.content ?? []).map((it) => ({
          id: it.id ?? it.orderId,
          orderNo: String(it.orderNo ?? it.id ?? it.orderId ?? '-'),
          product: it.productName ?? it.itemName ?? it.product?.name ?? '-',
          buyerName: it.receiverName ?? it.buyerName ?? it.buyer?.name ?? '-',
          price: Number(it.totalPrice ?? it.price ?? it.amount ?? 0) || 0,
          deliveredAt: it.deliveredAt ?? it.deliveryCompletedAt ?? it.shippedAt ?? null,
          feedbackAt: it.feedbackAt ?? it.feedbackSubmittedAt ?? null,
          payoutStatus: it.payoutStatus ?? it.status ?? 'PENDING',
          refundPaid: !!it.refundPaid,
        }))
        setRaw(list) // ✅ setRows → setRaw 로 수정
      } catch (e) {
        console.error(e)
        setError('주문 목록을 불러오지 못했습니다.')
        setRaw([])   // ✅ setRows → setRaw
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // 행 계산
  const rows = useMemo(() => {
    return (raw || []).map((o) => {
      const fee = Math.round((o.price || 0) * FEE_RATE)
      const basePayout = (o.price || 0) - fee - WRITER_FEE

      const delivered = toDate(o.deliveredAt)
      const deadline = delivered ? addDays(delivered, 7) : null
      const deadlinePassed = deadline ? today0.getTime() > deadline.getTime() : false

      const feedbackSubmitted = o.feedbackSubmitted ?? !!o.feedbackAt
      const refundPaid = !!o.refundPaid
      const refundDue = !feedbackSubmitted && deadlinePassed && !refundPaid ? WRITER_FEE : 0

      let writerState = { label: '선차감(대기)', cls: 'bg-yellow-50 text-yellow-700 ring-yellow-200' }
      if (feedbackSubmitted) writerState = { label: '지급(작성)', cls: 'bg-blue-50 text-blue-700 ring-blue-200' }
      if (refundDue > 0) writerState = { label: '환급 대상', cls: 'bg-green-50 text-green-700 ring-green-200' }

      const payoutState =
        o.payoutStatus === 'PAID'
          ? { label: '정산 완료', cls: 'bg-gray-100 text-gray-600 ring-gray-200' }
          : { label: '정산 가능', cls: 'bg-[#9DD5E9] text-white' }

      return { ...o, fee, basePayout, refundDue, writerState, payoutState, deadline }
    })
  }, [raw, today0])

  // 상단 요약
  const summary = useMemo(() => {
    const s = { payableNow: 0, refundDue: 0, fees: 0, count: 0 }
    rows.forEach((r) => {
      if (r.payoutState.label === '정산 가능') {
        s.payableNow += (r.basePayout - r.refundDue)
        s.fees += r.fee
        s.count += 1
      }
      s.refundDue += r.refundDue
    })
    return s
  }, [rows])

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">정산관리</h1>
      </div>

      {loading && <div className="mb-2 text-sm text-gray-500">불러오는 중…</div>}
      {error && <div className="mb-2 text-sm text-rose-600">오류: {error}</div>}

      {/* 요약 카드 */}
      {!loading && !error && (
        <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={box}>
            <div className="text-sm font-medium">정산 예정 금액</div>
            <div className="mt-1 text-2xl font-semibold">{fmt(summary.payableNow)}원</div>
            <div className="text-[12px] text-gray-500">수수료 합계 {fmt(summary.fees)}원</div>
          </div>
          <div className={box}>
            <div className="text-sm font-medium">환급 예정 원고료</div>
            <div className="mt-1 text-2xl font-semibold">{fmt(summary.refundDue)}원</div>
            <div className="text-[12px] text-gray-500">피드백 미작성 건 환급</div>
          </div>
          <div className={box}>
            <div className="text-sm font-medium">수수료 정책</div>
            <ul className="mt-1 list-disc pl-5 text-[12px] text-gray-600">
              <li>수수료: {Math.round(FEE_RATE * 100)}%</li>
              <li>원고료: {fmt(WRITER_FEE)}원 (선차감)</li>
              <li>D+7 피드백 미작성 시 원고료 환급</li>
            </ul>
          </div>
        </section>
      )}

      {/* 목록 */}
      {!loading && !error && (
        <section className={`${box} overflow-hidden`}>
          <div className="w-full overflow-x-auto [scrollbar-gutter:stable]">
            <div className="max-h-[560px] overflow-y-auto">
              <table className="table-fixed text-left text-sm whitespace-nowrap" style={{ width: TABLE_MIN_W }}>
                <colgroup>
                  {HEADERS.map((h, i) => (
                    <col key={i} style={{ width: h.w }} />
                  ))}
                </colgroup>

                <thead className="sticky top-0 z-10 border-b bg-gray-50 text-center text-[13px] text-gray-500">
                  <tr>
                    {HEADERS.map((h) => (
                      <th key={h.label} className="px-3 py-2">{h.label}</th>
                    ))}
                  </tr>
                </thead>

                <tbody className="[&>tr]:h-12 text-center">
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-none">
                      <td
                        className="px-3 py-2 font-mono text-[13px] text-blue-600 hover:underline cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                        onClick={() => setDetail(r)}
                        title="상세 보기"
                      >
                        {r.orderNo}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis" title={r.product}>
                        {cut(r.product, 20)}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtDate(r.deadline)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmt(r.price)}원</td>
                      <td className="px-3 py-2 whitespace-nowrap">-{fmt(r.fee)}원</td>
                      <td className="px-3 py-2"><span className={badge(r.writerState.cls)}>{r.writerState.label}</span></td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">{fmt(r.basePayout - r.refundDue)}원</td>
                      <td className="px-3 py-2"><span className={badge(r.payoutState.cls)}>{r.payoutState.label}</span></td>
                      <td className="px-3 py-2 text-[12px] text-gray-600">{r.refundDue > 0 ? `환급 ${fmt(r.refundDue)}원` : '-'}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={HEADERS.length} className="px-3 py-8 text-center text-gray-500">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 상세 모달 */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={`주문 상세 - ${detail?.id ?? ''}`}>
        {detail && <OrderDetailContent row={detail} />}
      </Modal>

      <div className="h-8" />
    </div>
  )
}
