import api from '/src/config/axiosInstance'

// 404/405면 다음 후보로 넘어가고, 그 외엔 즉시 throw
const tryGet = async (path, params) => {
  try {
    const { data } = await api.get(path, { params })
    return data
  } catch (e) {
    const st = e?.response?.status
    if (st === 404 || st === 405) return null
    throw e
  }
}
const tryPost = async (path, body) => {
  try {
    const { data } = await api.post(path, body)
    return data
  } catch (e) {
    const st = e?.response?.status
    if (st === 404 || st === 405) return null
    throw e
  }
}

const normalizePage = (raw) => {
  if (!raw) return { content: [], totalElements: 0, totalPages: 0, page: 0 }
  if (Array.isArray(raw)) return { content: raw, totalElements: raw.length, totalPages: 1, page: 0 }
  if (raw.content) return { content: raw.content, totalElements: raw.totalElements ?? raw.total ?? raw.content.length, totalPages: raw.totalPages ?? 1, page: raw.number ?? 0 }
  if (raw.items) return { content: raw.items, totalElements: raw.total ?? raw.items.length, totalPages: raw.pages ?? 1, page: raw.page ?? 0 }
  return { content: [], totalElements: 0, totalPages: 0, page: 0 }
}

/** 신고 목록 조회 */
export const fetchFeedbackReports = async ({ status = 'PENDING', q = '', page = 0, size = 20 } = {}) => {
  const params = { status: status === 'ALL' ? undefined : status, q, page, size }
  const candidates = [
    '/api/admin/feedback-reports',
    '/api/admin/feedbacks/reports',
    '/api/admin/feedbacks',
    '/api/feedbacks/reports',
  ]
  for (const path of candidates) {
    const data = await tryGet(path, params)
    if (data) return normalizePage(data)
  }
  // 전부 404/405면 빈값
  return { content: [], totalElements: 0, totalPages: 0, page: 0 }
}

/** 승인 */
export const approveReport = async (id, body = {}) => {
  const payload = body && Object.keys(body).length ? body : { note: 'approved' }
  const candidates = [
    `/api/admin/feedback-reports/${id}/approve`,
    `/api/admin/feedbacks/${id}/approve`,
    `/api/feedbacks/reports/${id}/approve`,
  ]
  for (const path of candidates) {
    const data = await tryPost(path, payload)
    if (data) return data
  }
  throw new Error('승인 API 경로를 찾을 수 없습니다.')
}

/** 거절 */
export const rejectReport = async (id, body = {}) => {
  const payload = body && Object.keys(body).length ? body : { reason: 'rejected' }
  const candidates = [
    `/api/admin/feedback-reports/${id}/reject`,
    `/api/admin/feedbacks/${id}/reject`,
    `/api/feedbacks/reports/${id}/reject`,
  ]
  for (const path of candidates) {
    const data = await tryPost(path, payload)
    if (data) return data
  }
  throw new Error('거절 API 경로를 찾을 수 없습니다.')
}