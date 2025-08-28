// 셀러 피드백 관리
import React from 'react'
import Button from '/src/components/common/Button'
import { UI } from '/src/constants/sellerfeedbacks'
import { fmtDate, statusBadge } from '/src/util/feedbacksStatus'

// ▸ 주문번호: 숫자만 추출 + 최대 16자리
const toOrderNo16 = (input) => {
  const raw =
    input && typeof input === 'object'
      ? (input.orderId ?? input.id ?? '')
      : (input ?? '')
  const digits = String(raw).replace(/\D/g, '')
  return digits.slice(0, 16) || '-'
}

export default function FeedbackRow({ row, onOpenOrder, onRequestReport }) {
  const badge = statusBadge(row)
  const canReport = !!row.feedbackContent && !row.reportStatus

  return (
    <tr className="border-t">
      <td
        className={`px-3 py-2 ${UI.COLS.ORDER} font-mono text-[13px] cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis`}
        onClick={() => onOpenOrder(row)}
        title="상세 보기"
      >
        {toOrderNo16(row)}
      </td>
      <td className={`px-3 py-2 ${UI.COLS.PRODUCT}`}>
        <div className="truncate" title={row.product}>{row.product}</div>
      </td>
      <td className={`px-3 py-2 ${UI.COLS.BUYER}`}>
        <div className="truncate">{row.buyer}</div>
      </td>
      <td className={`px-3 py-2 ${UI.COLS.DATE}`}>{fmtDate(row.feedbackCreatedAt)}</td>
      <td className={`px-3 py-2 ${UI.COLS.STATUS}`}>
        <span className={`${UI.pill} ring-1 ${badge.cls}`}>{badge.text}</span>
      </td>
      <td className={`px-3 py-2 ${UI.COLS.CONTENT}`}>
        <div className="truncate" title={row.feedbackContent || '-'}>{row.feedbackContent || '-'}</div>
      </td>
      <td className={`px-3 py-2 ${UI.COLS.ACTION}`}>
        <Button
          className={`w-full border text-sm ${canReport ? 'border-red-300 text-red-600 hover:bg-red-50' : 'cursor-not-allowed opacity-40'}`}
          disabled={!canReport}
          onClick={() => onRequestReport(row)}
        >
          신고
        </Button>
      </td>
    </tr>
  )
}
