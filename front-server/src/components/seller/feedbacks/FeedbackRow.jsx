// /src/components/seller/feedbacks/FeedbackRow.jsx
import React from 'react'
import Button from '/src/components/common/Button'
import { statusBadge } from '/src/util/feedbacksStatus'
import { toOrderNo, truncate10 } from '/src/util/orderUtils'

export default function FeedbackRow({ row, onOpenOrder, onRequestReport }) {
  const badge = statusBadge(row)

  // 내용 존재 여부(키 가드)
  const hasContent = !!(row?.feedbackContent ?? row?.content)

  // 신고 상태(이미 신고했으면 비활성화: PENDING/APPROVED)
  const reported = String(row?.reportStatus ?? '').toUpperCase()
  const canReport = hasContent && reported !== 'PENDING' && reported !== 'APPROVED'

  // 작성일 표시
  const writtenAt = row?.writtenAt ?? row?.feedbackAt ?? row?.createdAt
  const writtenDate = writtenAt
    ? new Date(writtenAt).toISOString().slice(0, 10)
    : '-'

  return (
    <tr className="border-t">
      {/* 주문번호 – 클릭 시 상세 모달 */}
      <td className="px-3 py-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-auto p-0 text-blue-600 hover:underline"
          onClick={() => onOpenOrder?.(row)}
        >
          {toOrderNo(row)}
        </Button>
      </td>

      {/* 상품명 */}
      <td className="px-3 py-2 text-left" title={row?.productName || row?.product || ''}>
        {truncate10(row?.productName ?? row?.product ?? '')}
      </td>

      {/* 구매자 */}
      <td className="px-3 py-2 whitespace-nowrap">
        {row?.buyerName ?? row?.receiver ?? row?.name ?? '-'}
      </td>

      {/* 피드백 작성일 */}
      <td className="px-3 py-2 whitespace-nowrap">{writtenDate}</td>

      {/* 상태 */}
      <td className="px-3 py-2 whitespace-nowrap">
        <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </td>

      {/* 피드백 내용 */}
      <td className="px-3 py-2 text-left" title={row?.feedbackContent || row?.content || ''}>
        {truncate10(row?.feedbackContent ?? row?.content ?? '') || '-'}
      </td>

      {/* 신고 */}
      <td className="px-3 py-3 text-right">
        <Button
          size="sm"
          variant="admin"
          disabled={!canReport}
          onClick={() => {
            console.log('[REPORT_CLICK]', row)
            onRequestReport?.(row)
          }}
        >
          신고
        </Button>
      </td>
    </tr>
  )
}
