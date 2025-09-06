// /src/components/seller/feedbacks/FeedbackRow.jsx
import React from 'react'
import Button from '../../common/Button'
import { statusBadge } from '../../../util/FeedbacksStatus'
import { toOrderNo, truncate10 } from '../../../util/orderUtils'

// ---- 안전 필드 해석기 (키 변동 대비)
const firstF = (r) => (Array.isArray(r?.feedbacks) && r.feedbacks.length > 0 ? r.feedbacks[0] : null)
const resolveFeedbackId = (r) =>
  r?.feedbackId
  ?? r?.id                      // ← 백엔드/서비스에서 row.id=feedbackId 로 내려오는 케이스 지원
  ?? r?.feedback?.id
  ?? firstF(r)?.id
  ?? r?.feedback_id             // ← 혹시 스네이크 케이스 대응
  ?? null

const resolveFeedbackDate = (r) =>
  r?.writtenAt
  ?? r?.feedbackAt ?? r?.feedback_at
  ?? r?.feedback?.createdAt ?? r?.feedback?.created_at
  ?? firstF(r)?.createdAt ?? firstF(r)?.created_at
  ?? r?.createdAt ?? r?.created_at
  ?? null

const resolveFeedbackContent = (r) =>
  r?.feedbackContent
  ?? r?.feedback?.content
  ?? firstF(r)?.content
  ?? r?.content
  ?? r?.feedbackText
  ?? ''

const resolveReportStatus = (r) =>
  String(r?.reportStatus ?? r?.feedbackReportStatus ?? firstF(r)?.reportStatus ?? '').toUpperCase()

const toYmd = (v) => {
  if (!v) return '-'
  const s = String(v)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10) // 이미 YYYY-MM-DD
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function FeedbackRow({
  row,
  onOpenOrder,
  onRequestReport,
  reportDisabled = false,
  reportState = '',                // ★ 추가
}) {
  const badge = statusBadge(row)

  // 내용 존재 여부(키 가드)
  const hasContent =
    String(resolveFeedbackContent(row) ?? '').trim().length > 0
    || (Array.isArray(row?.images) && row.images.length > 0)
    || !!(row?.feedbackAt || row?.feedbackCreatedAt || row?.createdAt)

  // 신고 상태(이미 신고했으면 비활성화: PENDING/APPROVED)
  const fid = resolveFeedbackId(row)
  const reported = resolveReportStatus(row)
  const canReport = !!fid && hasContent && !['PENDING', 'APPROVED'].includes(reported)

  // 👇 로그: 이 값 중 하나라도 false면 버튼이 비활성
  console.debug('[ROW_REPORT_DEBUG]', {
    fid, reported, hasContent,
    contentLen: String(resolveFeedbackContent(row) ?? '').length,
    orderUid: row?.orderUid
  })

  // 작성일 표시
  const writtenDate = toYmd(resolveFeedbackDate(row))

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
        <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium ${badge?.cls ?? badge?.className ?? ''}`}>
          {badge.label}
        </span>
      </td>

      {/* 피드백 내용 */}
      <td className="px-3 py-2 text-left" title={resolveFeedbackContent(row)}>
        {truncate10(resolveFeedbackContent(row)) || '-'}
      </td>

      {/* 신고 */}
      <td className="px-3 py-3 text-center">
        {/*
    - NORMAL: admin (보라색)
    - PENDING/REJECTED: ghost(연한 스타일) + disabled
    - APPROVED: disabled 유지(색은 admin 유지하고 싶으면 아래 분기 조정)
  */}
        <Button
          variant={(reportState === 'PENDING' || reportState === 'REJECTED') ? 'ghost' : 'admin'}
          size="sm"
          className={reportDisabled ? 'cursor-not-allowed' : ''}
          onClick={() => onRequestReport(row)}
          disabled={reportDisabled}
        >
          신고
        </Button>
      </td>
    </tr>
  )
}
