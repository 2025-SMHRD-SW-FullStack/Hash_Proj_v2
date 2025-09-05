// /src/components/seller/OrderDetailContent.jsx
import React, { useMemo } from 'react'
import { toOrderNo, fmtYmd, resolveFeedbackDue } from '../../util/orderUtils'
import { carrierLabel, resolveCarrier as resolveCarrierByName } from '../../constants/carriers'

// 공통 pick
const pick = (...vals) => vals.find(v => v != null && v !== '')

// ---- 상태 뱃지
const pill = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium'
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

// ---- row 해석기(하드코딩 회피용)
const resolveOrderedAt = (r) =>
  fmtYmd(pick(r?.orderedAt, r?.orderDate, r?.createdAt, r?.paidAt))

const resolveStatusText = (r) =>
  pick(r?.statusText, r?.status) || '-'

const resolveCarrierName = (r) => {
  const code = pick(r?.carrierCode, r?.courierCode, resolveCarrierByName(r?.courierName || '')?.code)
  return pick(carrierLabel(code || ''), r?.courierName) || '-'
}
const resolveTrackingNo = (r) =>
  pick(r?.trackingNo, r?.trackingNumber) || '-'

const resolveProductName = (r) =>
  pick(r?.productName, r?.product?.name, r?.product) || '-'

const resolveBuyerName = (r) =>
  pick(r?.buyer, r?.receiver, r?.buyerName, r?.buyer?.name) || '-'

const resolvePhone = (r) =>
  pick(r?.phone, r?.receiverPhone, r?.buyer?.phone) || '-'

const resolveAddress = (r) =>
  pick(r?.address, r?.deliveryAddress, r?.address1) || '-'

const resolveRequest = (r) =>
  pick(r?.requestMemo, r?.requestNote, r?.deliveryMemo) || '-'

const resolveFeedbackWrittenAt = (r) => {
  const arr0 = Array.isArray(r?.feedbacks) && r.feedbacks.length > 0 ? r.feedbacks[0] : null
  const raw = pick(r?.feedbackAt, r?.feedbackWrittenAt, r?.feedback?.createdAt, r?.feedback?.created_at, arr0?.createdAt, arr0?.created_at)
  return fmtYmd(raw)
}

// ✅ 피드백 내용 해석기 (단일/배열/중첩 모두 커버)
const resolveFeedbackText = (r) => {
  const arr0 = Array.isArray(r?.feedbacks) && r.feedbacks.length > 0 ? r.feedbacks[0] : null
  // 우선순위: row.feedbackText → row.feedback.content → row.feedbacks[0].content → row.feedback(문자형)
  return pick(r?.feedbackText, r?.feedback?.content, arr0?.content, r?.feedback) || '-'
}

export default function OrderDetailContent({ row }) {
  if (!row) return null

  // 표기 값들: 어떤 스키마가 와도 위 resolver가 알아서 처리
  const displayOrderNo      = useMemo(() => toOrderNo(row), [row])
  const displayOrderedAt    = useMemo(() => resolveOrderedAt(row), [row])
  const displayStatus       = useMemo(() => resolveStatusText(row), [row])
  const displayFeedbackDue  = useMemo(() => resolveFeedbackDue(row), [row])
  const displayFeedbackAt   = useMemo(() => resolveFeedbackWrittenAt(row), [row])
  const displayCarrierName  = useMemo(() => resolveCarrierName(row), [row])
  const displayTrackingNo   = useMemo(() => resolveTrackingNo(row), [row])
  const displayProduct      = useMemo(() => resolveProductName(row), [row])
  const displayBuyer        = useMemo(() => resolveBuyerName(row), [row])
  const displayPhone        = useMemo(() => resolvePhone(row), [row])
  const displayAddress      = useMemo(() => resolveAddress(row), [row])
  const displayRequest      = useMemo(() => resolveRequest(row), [row])
  const displayFeedbackText = useMemo(() => resolveFeedbackText(row), [row])

  const rows = [
    ['주문번호', <span className="font-mono">{displayOrderNo}</span>],
    ['주문일', displayOrderedAt],
    ['상태', <StatusPill status={displayStatus} />],
    ['피드백 마감', displayFeedbackDue],
    ['피드백 작성일', displayFeedbackAt],
    ['택배사', displayCarrierName],
    ['운송장', displayTrackingNo],
    ['상품명', displayProduct],
    ['받는이', displayBuyer],
    ['연락처', displayPhone],
    ['주소', displayAddress],
    ['배송요청사항', displayRequest],
    ['피드백 내용', displayFeedbackText],
  ]

  return (
    <div className="px-4">
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
