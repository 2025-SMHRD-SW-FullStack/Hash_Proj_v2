// src/service/adminSellerService.js
import api from '../config/axiosInstance'

// 필요 시 여기만 바꾸면 됨
const BASE = '/api/admin/seller-applications'

/**
 * 신청 목록 조회 (Spring Data Page 응답)
 * @param {{status?: 'ALL'|'PENDING'|'APPROVED'|'REJECTED', q?: string, page?: number, size?: number}} params
 * @returns {Promise<{
 *   content: any[], totalElements: number, totalPages: number,
 *   number: number, size: number, first: boolean, last: boolean
 * }>}
 */
export const adminSearchSellerApplications = async ({
  status = 'PENDING',
  q = '',
  page = 0,
  size = 20,
} = {}) => {
  const params = { page, size }
  if (status && status !== 'ALL') params.status = status
  if (q) params.q = q
  const { data } = await api.get(BASE, { params })
  return data
}

/** 상세 조회 */
export const adminGetSellerApplication = async (id) => {
  const { data } = await api.get(`${BASE}/${id}`)
  return data
}

/** 승인 (SellerDecisionRequest.memo 사용) */
export const adminApproveSeller = async (id, memo = '') => {
  const { data } = await api.post(`${BASE}/${id}/approve`, { memo })
  return data
}

/** 반려 (SellerDecisionRequest.memo 사용) */
export const adminRejectSeller = async (id, reason = '') => {
  const { data } = await api.post(`${BASE}/${id}/reject`, { memo: reason })
  return data
}
