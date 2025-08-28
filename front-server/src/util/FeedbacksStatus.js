// 날짜 포맷 단축
export const fmtDate = (d) => {
  if (!d) return '-'
  const x = (d instanceof Date) ? d : new Date(String(d))
  if (Number.isNaN(x.getTime())) return '-'
  const yyyy = x.getFullYear()
  const mm = String(x.getMonth() + 1).padStart(2, '0')
  const dd = String(x.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * 상태 뱃지 계산
 *  - 작성 대기(D-n), 기간 만료
 *  - 신고 대기/신고 완료/신고 거절
 *  - 교환 처리중
 *  색상 클래스는 Tailwind 기준. 필요하면 프로젝트 팔레트로 치환.
 */
export const statusBadge = (row = {}) => {
  // 신고 관련 우선
  if (row.reportStatus === 'PENDING')  return { text: '신고 대기',   cls: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' }
  if (row.reportStatus === 'APPROVED') return { text: '신고 완료',   cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' }
  if (row.reportStatus === 'REJECTED') return { text: '신고 거절',   cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' }

  if (row.exchangeProcessing)          return { text: '교환 처리중', cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' }

  // 작성 대기/기간 만료 계산(예: 배송완료일 + 7일)
  const deliveredAt = row.deliveredAt ? new Date(row.deliveredAt) : null
  if (deliveredAt && !row.feedbackWrittenAt) {
    const now = new Date()
    const deadline = new Date(deliveredAt.getTime() + 7 * 86400000)
    if (now <= deadline) {
      const dLeft = Math.ceil((deadline - now) / 86400000)
      return { text: `작성 대기 (D-${dLeft})`, cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' }
    }
    return { text: '기간 만료', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' }
  }

  // 신규 작성(예: 최근 24h 내 작성)
  if (row.feedbackWrittenAt) {
    const written = new Date(row.feedbackWrittenAt)
    const now = new Date()
    if (!Number.isNaN(written.getTime()) && now - written < 24 * 3600 * 1000) {
      return { text: '신규 작성', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' }
    }
  }

  // 기본
  return { text: '—', cls: 'bg-gray-50 text-gray-500 ring-1 ring-gray-200' }
}
