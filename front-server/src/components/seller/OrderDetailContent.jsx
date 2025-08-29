import React from 'react'
import { carrierLabel } from '/src/constants/carriers'

// 주문상세내역

// ---- 유틸 (OrdersPage와 동일 로직)
const pill = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium'
const toDate = (s) => (s ? new Date(s + 'T00:00:00') : null)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)
const today0 = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t }
const feedbackDeadline = (deliveredAt) => { const d = toDate(deliveredAt); return d ? addDays(d, 7) : null }
const isPurchaseConfirmed = (o) => {
  if (!o.deliveredAt) return false
  const deadline = feedbackDeadline(o.deliveredAt)
  if (!deadline) return false
  const now = today0()
  if (now > deadline) return true
  if (o.feedbackAt) return new Date(o.feedbackAt) <= deadline
  return false
}
const statusKind = (s) => {
  if (!s) return 'other'
  if (s === '구매확정') return 'confirmed'
  if (s.includes('준비') || s === '배송준비중') return 'ready'
  if (s === '배송중') return 'shipping'
  if (s === '배송완료') return 'delivered'
  return 'other'
}
const StatusPill = ({ status }) => {
  const kind = statusKind(status)
  const cls =
    kind === 'ready'
      ? `${pill} bg-amber-50 text-amber-700 ring-1 ring-amber-200`
      : kind === 'shipping'
        ? `${pill} bg-blue-50 text-blue-700 ring-1 ring-blue-200`
        : kind === 'delivered'
          ? `${pill} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`
          : kind === 'confirmed'
            ? `${pill} bg-violet-50 text-violet-700 ring-1 ring-violet-200`
            : `${pill} bg-slate-50 text-slate-700 ring-1 ring-slate-200`
  return <span className={cls}>{status || '-'}</span>
}
const DeadlinePill = ({ deliveredAt, feedbackAt }) => {
  if (!deliveredAt) return <span className={`${pill} bg-gray-100 text-gray-600`}>-</span>
  const deadline = feedbackDeadline(deliveredAt)
  if (!deadline) return <span className={`${pill} bg-gray-100 text-gray-600`}>-</span>
  if (feedbackAt && new Date(feedbackAt) <= deadline) {
    return <span className={`${pill} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`}>작성완료</span>
  }
  const dday = Math.ceil((deadline.getTime() - today0().getTime()) / 86400000)
  if (dday < 0) return <span className={`${pill} bg-rose-50 text-rose-700 ring-1 ring-rose-200`}>미작성</span>
  return <span className={`${pill} bg-slate-50 text-slate-700 ring-1 ring-slate-200`}>D-{dday}</span>
}

export default function OrderDetailContent({ row }) {
  if (!row) return null
  const displayStatus = isPurchaseConfirmed(row) ? '구매확정' : (row.status || '-')

  // ✅ 요청한 순서로 재배열
  const rows = [
    ['주문번호', <span className="font-mono">{row.id}</span>],
    ['주문일', row.orderedAt || '-'],
    ['상태', <StatusPill status={displayStatus} />],
    ['피드백 마감', <DeadlinePill deliveredAt={row.deliveredAt} feedbackAt={row.feedbackAt} />],
    ['피드백 작성일', row.feedbackAt || '-'],
    ['택배사', carrierLabel(row.carrierCode || '') || '-'],
    ['운송장', row.trackingNo || '-'],
    ['상품명', row.product || '-'],
    ['가격', row.price != null ? `${Number(row.price).toLocaleString()}원` : '-'],
    ['받는이', row.buyer || '-'],
    ['주소', row.address || '-'],
    ['연락처', row.phone || '-'],
    ['배송요청사항', row.requestNote || '-'],
    ['피드백 내용', row.feedbackText || row.feedback || '-'],
  ]

  // ✅ 표 스타일 + 라벨 가운데 정렬
  return (
    <div className="max-h-[70vh] overflow-auto"> {/* 모달 내부도 스크롤 가능 */}
      <table className="w-full table-fixed text-sm border-separate [border-spacing:0]">
        <tbody className="divide-y divide-gray-200">
          {rows.map(([label, value], idx) => (
            <tr key={idx}>
              <th
                scope="row"
                className="w-40 whitespace-nowrap bg-gray-50 px-4 py-2 text-center font-medium text-gray-600 align-top"
              >
                {label}
              </th>
              <td className="px-4 py-2 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}