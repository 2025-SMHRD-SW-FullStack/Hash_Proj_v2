// /src/util/feedbacksStatus.js

// 날짜 포맷: 'YYYY-MM-DD'만 필요
export const fmtDate = (iso) => {
  if (!iso) return '-'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d?.getTime?.())) return '-'
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 내부: D-문자열 파싱
const parseDday = (feedbackDue) => {
  if (!feedbackDue) return null
  const m = /^D-(\d+)$/.exec(String(feedbackDue).trim())
  if (!m) return null
  return parseInt(m[1], 10)
}

/** 상태 계산
 * row는 주문 그리드 행에 아래 필드 중 일부가 있을 수 있음:
 * - feedbackDue: 'D-5' 같은 문자열
 * - statusText: 주문/배송 상태 원문
 * - feedbackAt: 피드백 작성시각(백엔드에서 아직 제공되지 않을 수 있음 → 없으면 판단 제외)
 * - reportStatus: 'PENDING' | 'APPROVED' | 'REJECTED' (없을 수 있음)
 */
export const computeFeedbackState = (row = {}) => {
  // 신고 계열 우선 표시
  const rs = row.reportStatus
  if (rs === 'PENDING') return { key: 'REPORT_PENDING', label: '신고대기' }
  if (rs === 'APPROVED') return { key: 'REPORTED', label: '신고완료' }
  if (rs === 'REJECTED') return { key: 'REPORT_REJECTED', label: '신고거절' }

  // 교환 처리중 (문자열에 '교환' 포함 시)
  if (String(row.statusText || '').includes('교환')) {
    return { key: 'EXCHANGE', label: '교환처리중' }
  }

  // 신규 작성: 최근 24시간 이내 작성
  if (row.feedbackAt) {
    const dt = new Date(row.feedbackAt)
    if (!Number.isNaN(dt.getTime())) {
      const diff = Date.now() - dt.getTime()
      if (diff >= 0 && diff < 24 * 3600 * 1000) {
        return { key: 'NEW', label: '신규작성' }
      }
    }
    // 작성은 됐지만 24시간은 지남 → 표시는 '작성완료'로만 처리할 수도 있음
    return { key: 'NEW', label: '신규작성' }
  }

  const d = parseDday(row.feedbackDue)
  if (typeof d === 'number') {
    if (d >= 0) return { key: 'PENDING_WRITE', label: `작성대기 (D-${d})` }
  }
  // d 없음 또는 마감 지남
  return { key: 'EXPIRED', label: '기간만료' }
}

// 표에서 쓰는 뱃지 클래스와 라벨
export const statusBadge = (row = {}) => {
  const { key, label } = computeFeedbackState(row)
  const base = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium'
  let cls = `${base} bg-slate-50 text-slate-700 ring-1 ring-slate-200`
  if (key === 'PENDING_WRITE') cls = `${base} bg-amber-50 text-amber-700 ring-1 ring-amber-200`
  else if (key === 'EXPIRED') cls = `${base} bg-rose-50 text-rose-700 ring-1 ring-rose-200`
  else if (key === 'NEW') cls = `${base} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`
  else if (key === 'REPORT_PENDING') cls = `${base} bg-violet-50 text-violet-700 ring-1 ring-violet-200`
  else if (key === 'REPORTED') cls = `${base} bg-blue-50 text-blue-700 ring-1 ring-blue-200`
  else if (key === 'REPORT_REJECTED') cls = `${base} bg-gray-100 text-gray-700 ring-1 ring-gray-200`
  else if (key === 'EXCHANGE') cls = `${base} bg-sky-50 text-sky-700 ring-1 ring-sky-200`
  return { key, label, cls }
}
