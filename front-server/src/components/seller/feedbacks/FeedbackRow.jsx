import React from 'react'
import Button from '/src/components/common/Button'
import { UI } from '/src/constants/sellerfeedbacks'
import { fmtDate, statusBadge } from '/src/util/feedbacksStatus'

// ▸ 주문번호: 숫자만 추출 + 최대 16자리
const toOrderNo16 = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.slice(0, 16) || '-' // 숫자 없으면 '-'
}

/**
 * props:
 *  - row
 *  - onOpenOrder(orderId | row)
 *  - onRequestReport(row)
 */
export default function FeedbackRow({ row, onOpenOrder, onRequestReport }) {
  const badge = statusBadge(row)
  const badgeText = badge?.text ?? badge?.label ?? ''
  const badgeCls  = badge?.cls  ?? badge?.className ?? ''

  // 신고 가능 조건(예: 내용이 있고 아직 신고 진행 안 됨)
  const canReport = !!row?.feedbackContent && !row?.reportStatus

  return (
    <tr className="border-t">
      {/* 주문번호: 클릭 시 주문상세 모달(페이지 정책) */}
      <td className="px-3 py-2 text-blue-600 underline-offset-2 hover:underline cursor-pointer"
          onClick={() => onOpenOrder?.(row?.orderId ?? row?.id ?? row)}>
        {toOrderNo16(row?.orderId ?? row?.id)}
      </td>

      {/* 상품명 */}
      <td className="px-3 py-2">{row?.productName ?? '-'}</td>

      {/* 구매자 */}
      <td className="px-3 py-2">{row?.buyerName ?? '-'}</td>

      {/* 배송완료일 */}
      <td className="px-3 py-2">{fmtDate(row?.deliveredAt)}</td>

      {/* 피드백 작성일 */}
      <td className="px-3 py-2">{fmtDate(row?.feedbackWrittenAt)}</td>

      {/* 상태 뱃지 */}
      <td className="px-3 py-2">
        <span className={`${UI.pill} ${badgeCls}`}>{badgeText}</span>
      </td>

      {/* 액션: ✅ 신고 버튼만 남김 (모든 버튼은 admin) */}
      <td className="px-3 py-2 text-right">
        <Button
          size="sm"
          variant="admin"
          disabled={!canReport}
          onClick={() => canReport && onRequestReport?.(row)}
        >
          신고
        </Button>
      </td>
    </tr>
  )
}
