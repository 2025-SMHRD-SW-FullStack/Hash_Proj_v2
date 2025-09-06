// /src/util/feedbacksStatus.js

// ===== 공통 상수 =====
/** 수정/신규표시 등 기간 기준(일) — 하드코딩 금지, 한 곳에서만 관리 */
export const FEEDBACK_EDIT_WINDOW_DAYS = 7;

// ===== 공통 날짜 유틸 =====
export const fmtDate = (iso) => {
  if (!iso) return '-'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d?.getTime?.())) return '-'
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 'YYYY-MM-DD' 또는 ISO 문자열 모두 안전 파싱 → 자정(로컬)로 정규화
const toDate0 = (val) => {
  if (!val) return null
  const s = String(val)
  const d = new Date(s.includes('T') ? s : `${s}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d
}
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)
const today0 = () => { const t = new Date(); t.setHours(0,0,0,0); return t }

// 내부: D-문자열 파싱 (예: 'D-5' → 5)
const parseDday = (feedbackDue) => {
  if (!feedbackDue) return null
  const m = /^D-(\d+)$/.exec(String(feedbackDue).trim())
  if (!m) return null
  return parseInt(m[1], 10)
}

// ===== 작성/수정 가능 여부 유틸 =====
/** 배송완료일 기준 수정 가능 마감(자정 기준) */
export const feedbackDeadline = (deliveredAt) => {
  const d0 = toDate0(deliveredAt)
  return d0 ? addDays(d0, FEEDBACK_EDIT_WINDOW_DAYS) : null
}

/** 오늘이 마감일(포함) 이전인지 */
export const isWithinEditWindow = (deliveredAt) => {
  const dl = feedbackDeadline(deliveredAt)
  if (!dl) return false
  return today0().getTime() <= dl.getTime()
}

/**
 * canWrite: 구매확정(CONFIRMED) + 기간 내 + 아직 작성 없음
 * orderItem: { status, deliveredAt, ... }
 * existingFeedback: null | { id: ... }
 */
export const canWriteFeedback = (orderItem, existingFeedback) => {
  if (!orderItem) return false
  const isConfirmed = orderItem.status === 'CONFIRMED'
  const periodOK = isWithinEditWindow(orderItem.deliveredAt)
  const notWritten = !existingFeedback
  return isConfirmed && periodOK && notWritten
}

/** canEdit: 기간 내 + 피드백 존재 */
export const canEditFeedback = (orderItem, existingFeedback) => {
  if (!orderItem) return false
  const periodOK = isWithinEditWindow(orderItem.deliveredAt)
  return Boolean(existingFeedback) && periodOK
}

/** 버튼/라벨 상태 (주문 상세/목록의 액션 영역에서 사용) */
export const feedbackActionState = (orderItem, existingFeedback) => {
  if (existingFeedback) {
    if (isWithinEditWindow(orderItem?.deliveredAt)) {
      return { label: '피드백 작성 완료', sub: '수정 가능(7일 내)', state: 'done-editable' }
    }
    return { label: '피드백 작성 완료', sub: '수정 기간 만료', state: 'done-locked' }
  }
  if (!orderItem) return { label: '피드백 작성', sub: '', state: 'disabled' }

  if (orderItem.status !== 'CONFIRMED') {
    return { label: '피드백 작성', sub: '구매확정 후 가능', state: 'disabled' }
  }
  if (!isWithinEditWindow(orderItem.deliveredAt)) {
    return { label: '피드백 작성', sub: `작성 가능 기간(${FEEDBACK_EDIT_WINDOW_DAYS}일) 만료`, state: 'disabled' }
  }
  return { label: '피드백 작성', sub: '', state: 'enabled' }
}

// ===== 표 상태 계산 (기존 로직 개선: 7일 상수화/중복 제거) =====
/**
 * row 필드 예:
 * - feedbackDue: 'D-5'
 * - statusText: 주문/배송 상태 원문(예: '교환...')
 * - feedbackAt | feedbackCreatedAt | createdAt: 작성시각 후보
 * - feedbackContent | content: 내용 유무
 * - reportStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
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
  const writtenAt = row.feedbackAt || row.feedbackCreatedAt || row.createdAt || null
  const hasContent = !!(row?.feedbackContent ?? row?.content)

  if (writtenAt || hasContent) {
    if (writtenAt) {
      const wt = toDate0(writtenAt)
      if (wt) {
        // 3-1) 최근 24시간 이내면 '신규작성'
        const diffMs = Date.now() - new Date(writtenAt).getTime()
        if (diffMs >= 0 && diffMs < 24 * 3600 * 1000) {
          return { key: 'NEW', label: '신규작성' }
        }
        // 3-2) 작성 후 N일(자정 기준)까지는 '작성완료', 이후 '기간만료'
        const expiry = addDays(wt, FEEDBACK_EDIT_WINDOW_DAYS)
        if (Date.now() < expiry.getTime()) {
          return { key: 'NEW', label: '작성완료' }  // 스타일 NEW(초록), 라벨만 변경
        }
        return { key: 'EXPIRED', label: '기간만료' }
      }
    }
    // 작성시각이 없지만 내용이 있으면 작성완료로 간주
    return { key: 'NEW', label: '작성완료' }
  }

  // 4) 미작성: D-day(feedbackDue='D-5')로 판단
  const d = parseDday(row.feedbackDue)
  if (typeof d === 'number') {
    if (d >= 0) return { key: 'WAIT', label: `작성대기 (D-${d})` }
    return { key: 'EXPIRED', label: '기간만료' }
  }

  // 5) 정보가 모자라면 보수적으로 '작성대기'
  return { key: 'WAIT', label: '작성대기' }
}

// ===== 표 뱃지 스타일 (기존 유지) =====
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
  else if (key === 'EXCHANGE') cls = `${base} bg-sky-50 text-sky-700 ring-sky-200`
  return { key, label, cls }
}

/** 주문 아이템에서 '내' 피드백 안전 추출 */
export const getMyFeedbackFromItem = (item, me) => {
  if (!item) return null;
  if (item.myFeedback) return item.myFeedback;   // 서버가 myFeedback 제공하는 경우
  if (item.feedback)   return item.feedback;     // 단건 필드로 내려오는 경우
  if (Array.isArray(item.feedbacks)) {           // 목록에서 사용자 매칭
    const myId = me?.id ?? me?.userId;
    if (myId != null) {
      return item.feedbacks.find(f => (f?.user?.id ?? f?.userId) === myId) || null;
    }
  }
  return null;
};