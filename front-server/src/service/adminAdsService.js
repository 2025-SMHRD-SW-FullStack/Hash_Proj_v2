// /src/service/adminAdsService.js
import api from '../config/axiosInstance'

const BASE = '/api/ads/admin'

/** 관리자용 광고 예약 목록 */
export const adminFetchAdBookings = async ({ page = 0, size = 200, status, q } = {}) => {
  const params = { page, size }
  if (status) params.status = status // RESERVED_UNPAID|RESERVED_PAID|ACTIVE|COMPLETED|CANCELLED
  if (q) params.q = q
  const { data } = await api.get(`${BASE}/bookings`, { params })
  return data // Spring Data Page
}

/** 관리자: 광고 활성화 */
export const adminActivateAd = async (id) => {
  await api.post(`${BASE}/bookings/${id}/activate`)
}

/** 관리자: 광고 중단 */
export const adminCancelAd = async (id) => {
  await api.post(`${BASE}/bookings/${id}/cancel`)
}
