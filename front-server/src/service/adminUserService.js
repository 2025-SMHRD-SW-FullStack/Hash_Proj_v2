import api from '../config/axiosInstance';

/**
 * 관리자용 회원 목록 검색
 * @param {{ q?: string, role?: 'USER'|'SELLER', page?: number, size?: number }} params
 */
export const adminSearchUsers = async ({ q, role, page = 0, size = 10 } = {}) => {
  const finalParams = { q, page, size };
  if (role && role !== 'ALL') {
    finalParams.role = role;
  }
  const { data } = await api.get('/api/admin/users', { params: finalParams });
  return data; // Page<AdminUserResponse>
};

/**
 * 회원 제재 적용
 * @param {number} userId - 제재할 사용자 ID
 * @param {string | null} sanctionUntil - 제재 만료 시각 (ISO 8601) 또는 해제 시 null
 */
export const adminSanctionUser = async (userId, sanctionUntil) => {
  const { data } = await api.post(`/api/admin/users/${userId}/sanction`, { sanctionUntil });
  return data;
};