// /src/pages/seller/product/PayoutsPage.jsx
import React, { useMemo, useState } from 'react'

// 데이터 & 공용 컴포넌트
import ORDERS_MOCK from '../../data/sellerOrders'
import Modal from '../../components/common/Modal'
import OrderDetailContent from '../../components/seller/OrderDetailContent'

// ---- 정책 상수
const FEE_RATE = 0.03
const WRITER_FEE = 2000

// ---- UI 토큰
const box = 'rounded-xl border bg-white p-4 shadow-sm text-gray-900'
const badge = (cls) => `rounded-md px-2 py-1 text-[12px] ring-1 ${cls}`

// ---- 유틸
const startOfToday = () => { const t = new Date(); t.setHours(0,0,0,0); return t }
const toDate = (s) => (s ? new Date(s + 'T00:00:00') : null)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : n)
const fmtDate = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '-'
const cut = (s = '', n = 20) => (s.length > n ? s.slice(0, n) + '…' : s)

// ---- 컬럼 고정폭(가로 스크롤 보장)
const COLW = {
  ORDER_ID: 100,
  PRODUCT: 300,
  DEADLINE: 100,
  PRICE: 120,
  FEE: 90,
  WRITER: 120,
  PAYOUT: 130,
  STATE: 95,
  NOTE: 100,
}
const TABLE_MIN_W =
  COLW.ORDER_ID + COLW.PRODUCT + COLW.DEADLINE + COLW.PRICE + COLW.FEE +
  COLW.WRITER + COLW.PAYOUT + COLW.STATE + COLW.NOTE

export default function PayoutsPage() {
  const [detail, setDetail] = useState(null)
  const today0 = startOfToday()

  // 행 계산
  const rows = useMemo(() => {
    return (ORDERS_MOCK || []).map((o) => {
      const fee = Math.round(o.price * FEE_RATE)
      const basePayout = o.price - fee - WRITER_FEE // 선차감
      const delivered = toDate(o.deliveredAt)
      const deadline = delivered ? addDays(delivered, 7) : null
      const deadlinePassed = deadline ? today0.getTime() > deadline.getTime() : false

      // 환급 대상: D+7 경과 && 미작성 && 환급 미지급
      const refundDue = !o.feedbackSubmitted && deadlinePassed && !o.refundPaid ? WRITER_FEE : 0

      // 원고료 상태
      let writerState = { label: '선차감(대기)', cls: 'bg-yellow-50 text-yellow-700 ring-yellow-200' }
      if (o.feedbackSubmitted) writerState = { label: '지급(작성)', cls: 'bg-blue-50 text-blue-700 ring-blue-200' }
      if (refundDue > 0) writerState = { label: '환급 대상', cls: 'bg-green-50 text-green-700 ring-green-200' }

      // 정산 상태
      const payoutState =
        o.payoutStatus === 'PAID'
          ? { label: '정산 완료', cls: 'bg-gray-100 text-gray-600 ring-gray-200' }
          : { label: '정산 가능', cls: 'bg-[#9DD5E9] text-white' }

      return { ...o, fee, basePayout, refundDue, writerState, payoutState, deadline }
    })
  }, [today0])

  // 상단 요약
  const summary = useMemo(() => {
    const s = { payableNow: 0, refundDue: 0, fees: 0, count: 0 }
    rows.forEach((r) => {
      if (r.payoutState.label === '정산 가능') {
        s.payableNow += r.basePayout
        s.fees += r.fee
        s.count += 1
      }
      s.refundDue += r.refundDue
    })
    return s
  }, [rows])

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">정산관리</h1>
      </div>

      {/* 요약 카드 */}
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

      {/* 목록 */}
      <section className={`${box} overflow-hidden`}>
        {/* 가로 스크롤 컨테이너 */}
        <div className="w-full overflow-x-auto [scrollbar-gutter:stable]">
          {/* 세로 스크롤 컨테이너 (thead sticky 기준) */}
          <div className="max-h-[560px] overflow-y-auto">
            <table
              className="table-fixed text-left text-sm whitespace-nowrap"
              style={{ width: TABLE_MIN_W }} // ✅ 내부 가로 스크롤 강제
            >
              <colgroup>
                <col style={{ width: COLW.ORDER_ID }} />
                <col style={{ width: COLW.PRODUCT }} />
                <col style={{ width: COLW.DEADLINE }} />
                <col style={{ width: COLW.PRICE }} />
                <col style={{ width: COLW.FEE }} />
                <col style={{ width: COLW.WRITER }} />
                <col style={{ width: COLW.PAYOUT }} />
                <col style={{ width: COLW.STATE }} />
                <col style={{ width: COLW.NOTE }} />
              </colgroup>

              <thead className="sticky top-0 z-10 border-b bg-gray-50 text-center text-[13px] text-gray-500">
                <tr>
                  <th className="px-3 py-2">주문번호</th>
                  <th className="px-3 py-2">상품</th>
                  <th className="px-3 py-2">피드백 마감일</th>
                  <th className="px-3 py-2">결제금액</th>
                  <th className="px-3 py-2">수수료(3%)</th>
                  <th className="px-3 py-2">원고료</th>
                  <th className="px-3 py-2">셀러 정산액</th>
                  <th className="px-3 py-2">정산 상태</th>
                  <th className="px-3 py-2">비고</th>
                </tr>
              </thead>

              <tbody className="[&>tr]:h-12 text-center">
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-none">
                    {/* 주문번호 -> 상세 모달 */}
                    <td
                      className="px-3 py-2 font-mono text-[13px] text-blue-600 hover:underline cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                      onClick={() => setDetail(r)}
                      title="상세 보기"
                    >
                      {r.id}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis" title={r.product}>
                      {cut(r.product, 20)}
                    </td>

                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtDate(r.deadline)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(r.price)}원</td>
                    <td className="px-3 py-2 whitespace-nowrap">-{fmt(r.fee)}원</td>

                    <td className="px-3 py-2">
                      <span className={badge(r.writerState.cls)}>{r.writerState.label}</span>
                    </td>

                    <td className="px-3 py-2 font-semibold whitespace-nowrap">{fmt(r.basePayout)}원</td>

                    <td className="px-3 py-2">
                      <span className={badge(r.payoutState.cls)}>{r.payoutState.label}</span>
                    </td>

                    <td className="px-3 py-2 text-[12px] text-gray-600">
                      {r.refundDue > 0 ? `환급 ${fmt(r.refundDue)}원` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 상세 모달 */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`주문 상세 - ${detail?.id ?? ''}`}>
        {detail && <OrderDetailContent row={detail} />}
      </Modal>

      <div className="h-8" />
    </div>
  )
}
