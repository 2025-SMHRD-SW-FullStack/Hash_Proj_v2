// src/service/adminPointsService.js
import api from '../config/axiosInstance'

// 대기중 교환 목록 조회 (서버 페이징)
export async function fetchRequestedRedemptions({ page = 0, size = 10, q: query = '' } = {}) {
  const params = { page, size }
  if (typeof query === 'string' && query.trim()) {
    params.q = query.trim()
  }
  const { data } = await api.get('/api/admin/points/redemptions', { params })
  return data
}

export async function approveRedemption(id) {
  const { data } = await api.post(`/api/admin/points/redemptions/${id}/approve`)
  return data
}

export async function rejectRedemption(id) {
  const { data } = await api.post(`/api/admin/points/redemptions/${id}/reject`)
  return data
}
