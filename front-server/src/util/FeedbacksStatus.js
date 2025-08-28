// 피드백 상태 계산/분류 유틸 (작성대기 D-n일, 기간만료, 신고상태, 교환처리중)
import { NEW_THRESHOLD_HOURS, TAB_KEYS } from '/src/constants/sellerfeedbacks'

export const fmtDate = (s) => (s ? new Date(s).toLocaleDateString() : '-')
const ceilDays = (ms) => Math.ceil(ms / 86400000)

export const daysLeftLabel = (deadlineAt) => {
  if (!deadlineAt) return null
  const now = new Date()
  const dl = new Date(deadlineAt)
  const left = ceilDays(dl.getTime() - now.getTime())
  return left >= 0 ? `D-${left}일` : null
}

export const statusBadge = (row) => {
  // 우선순위: 교환처리중 > 신고 상태 > 작성대기/기간만료
  if (row.exchangeInProgress) return { text: '교환처리중', cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
  if (row.reportStatus === 'PENDING')  return { text: '신고대기', cls: 'bg-yellow-50 text-yellow-700 ring-yellow-200' }
  if (row.reportStatus === 'APPROVED') return { text: '신고완료', cls: 'bg-red-50 text-red-700 ring-red-200' }
  if (row.reportStatus === 'REJECTED') return { text: '신고거절', cls: 'bg-green-50 text-green-700 ring-green-200' }

  // 피드백 미작성
  if (!row.feedbackContent) {
    const now = new Date()
    const dl  = row.deadlineAt ? new Date(row.deadlineAt) : null
    if (dl && now.getTime() > dl.getTime()) return { text: '기간만료', cls: 'bg-gray-100 text-gray-600 ring-gray-200' }
    const dLabel = daysLeftLabel(row.deadlineAt)
    return { text: dLabel ? `작성대기(${dLabel})` : '작성대기', cls: 'bg-blue-50 text-blue-700 ring-blue-200' }
  }

  // 작성 완료 & 이슈 없음
  return { text: '—', cls: 'bg-gray-50 text-gray-500 ring-gray-200' }
}

export const isNewFeedback = (row) => {
  if (!row.feedbackContent || !row.feedbackCreatedAt) return false
  const diff = Date.now() - new Date(row.feedbackCreatedAt).getTime()
  return diff <= NEW_THRESHOLD_HOURS * 3600 * 1000
}

export const classify = (row) => {
  if (row.exchangeInProgress) return TAB_KEYS.EXCHANGE
  if (row.reportStatus === 'PENDING')  return TAB_KEYS.REPORT_PENDING
  if (row.reportStatus === 'APPROVED') return TAB_KEYS.REPORT_APPROVED
  if (row.reportStatus === 'REJECTED') return TAB_KEYS.REPORT_REJECTED

  if (!row.feedbackContent) {
    const now = new Date()
    const dl  = row.deadlineAt ? new Date(row.deadlineAt) : null
    if (dl && now.getTime() > dl.getTime()) return TAB_KEYS.EXPIRED
    return TAB_KEYS.WAIT
  }
  return isNewFeedback(row) ? TAB_KEYS.NEW : TAB_KEYS.ALL
}
