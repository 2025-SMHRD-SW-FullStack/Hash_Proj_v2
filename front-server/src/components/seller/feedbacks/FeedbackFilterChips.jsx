import React from 'react'
import StatusChips from '/src/components/product/StatusChips'
import { TAB_KEYS } from '/src/constants/sellerfeedbacks'

export default function FeedbackFilterChips({ counts, value, onChange }) {
  return (
    <StatusChips
      items={[
        { key: TAB_KEYS.ALL,             label: '전체',                        count: counts[TAB_KEYS.ALL] },
        { key: TAB_KEYS.NEW,             label: `신규 작성 ${counts[TAB_KEYS.NEW]}건` },
        { key: TAB_KEYS.WAIT,            label: `작성대기 ${counts[TAB_KEYS.WAIT]}건` },
        { key: TAB_KEYS.EXPIRED,         label: `기간만료 ${counts[TAB_KEYS.EXPIRED]}건` },
        { key: TAB_KEYS.REPORT_PENDING,  label: `신고대기 ${counts[TAB_KEYS.REPORT_PENDING]}건` },
        { key: TAB_KEYS.REPORT_APPROVED, label: `신고완료 ${counts[TAB_KEYS.REPORT_APPROVED]}건` },
        { key: TAB_KEYS.REPORT_REJECTED, label: `신고 거절 ${counts[TAB_KEYS.REPORT_REJECTED]}건` },
        { key: TAB_KEYS.EXCHANGE,        label: `교환처리중 ${counts[TAB_KEYS.EXCHANGE]}건` },
      ]}
      value={value}
      onChange={onChange}
      size="sm"
      variant="admin"
    />
  )
}
