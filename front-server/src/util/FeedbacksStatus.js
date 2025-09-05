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
  // 1) 신고 계열 우선
  const rs = row.reportStatus
  if (rs === 'PENDING')  return { key: 'REPORT_PENDING',  label: '신고대기' }
  if (rs === 'APPROVED') return { key: 'REPORTED',        label: '신고완료' }
  if (rs === 'REJECTED') return { key: 'REPORT_REJECTED', label: '신고거절' }

  // 2) 교환 처리중
  if (String(row.statusText || '').includes('교환')) {
    return { key: 'EXCHANGE', label: '교환처리중' }
  }

  // 3) 작성 여부 우선 판단
  //    - 작성시각 후보: feedbackAt(기존 로직 유지) → feedbackCreatedAt → createdAt
  //    - 내용만 있어도 작성으로 인정
  const writtenAt = row.feedbackAt || row.feedbackCreatedAt || row.createdAt || null
  const hasContent = !!(row?.feedbackContent ?? row?.content)

  if (writtenAt || hasContent) {
    if (writtenAt) {
      const dt = new Date(writtenAt)
      if (!Number.isNaN(dt.getTime())) {
        // 3-1) 최근 24시간 이내면 '신규작성' (셀러 메인에서 쓰는 규칙 유지)
        const diff = Date.now() - dt.getTime()
        if (diff >= 0 && diff < 24 * 3600 * 1000) {
          return { key: 'NEW', label: '신규작성' }
        }
        // 3-2) 작성 후 7일(자정 기준)까지는 '작성완료', 그 이후는 '기간만료'
        const expiry = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
        expiry.setDate(expiry.getDate() + 7)
        if (Date.now() < expiry.getTime()) {
          return { key: 'NEW', label: '작성완료' }  // 스타일은 NEW(초록), 라벨만 변경
        }
        return { key: 'EXPIRED', label: '기간만료' }
      }
    }
    // 작성시각이 없지만 내용이 있으면 작성완료로 간주
    return { key: 'NEW', label: '작성완료' }
  }

  // 4) 미작성: D-day(feedbackDue='D-5')로 판단
  const d = (() => {
    const v = row.feedbackDue
    if (!v) return null
    const m = /^D-(\d+)$/.exec(String(v).trim())
    return m ? parseInt(m[1], 10) : null
  })()

  if (typeof d === 'number') {
    if (d >= 0) return { key: 'WAIT', label: `작성대기 (D-${d})` }
    return { key: 'EXPIRED', label: '기간만료' }
  }

  // 5) D-day 없으면 보수적으로 '작성대기' (이전엔 무조건 만료 처리하던 문제 방지)
  return { key: 'WAIT', label: '작성대기' }
}

// 표에서 쓰는 뱃지 클래스와 라벨
export const statusBadge = (row = {}) => {
  const { key, label } = computeFeedbackState(row)
  const base = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium'
  let cls = `${base} bg-slate-50 text-slate-700 ring-1 ring-slate-200`
  if (key === 'WAIT') cls = `${base} bg-amber-50 text-amber-700 ring-1 ring-amber-200`
  else if (key === 'EXPIRED') cls = `${base} bg-rose-50 text-rose-700 ring-1 ring-rose-200`
  else if (key === 'NEW') cls = `${base} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`
  else if (key === 'REPORT_PENDING') cls = `${base} bg-violet-50 text-violet-700 ring-1 ring-violet-200`
  else if (key === 'REPORTED') cls = `${base} bg-blue-50 text-blue-700 ring-1 ring-blue-200`
  else if (key === 'REPORT_REJECTED') cls = `${base} bg-gray-100 text-gray-700 ring-1 ring-gray-200`
  else if (key === 'EXCHANGE') cls = `${base} bg-sky-50 text-sky-700 ring-1 ring-sky-200`
  return { key, label, cls }
}
