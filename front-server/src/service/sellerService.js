import api from '../config/axiosInstance';

/**
 * 셀러 등록을 신청하거나 재신청합니다.
 * @param {object} payload - 셀러 신청에 필요한 정보 객체
 * @returns {Promise<object>} - 신청 후 반환되는 셀러 프로필 정보
 */
export const applySeller = async (payload) => {
  // 서버 DTO에 없는 값(zipcode 등)은 보내지 않도록 방어
  const body = {
    bizNo: payload.bizNo?.trim(),
    shopName: payload.shopName?.trim(),
    ownerName: payload.ownerName?.trim(),
    addr: payload.addr?.trim(),
    phone: payload.phone?.trim(),
    category: payload.category?.trim(),
  };
  const { data } = await api.post('/api/seller-apply', body);
  return data;
};

/**
 * 현재 로그인한 사용자의 셀러 신청 현황을 조회합니다.
 * @returns {Promise<object>} - 셀러 프로필 정보. 신청 내역이 없으면 null 반환
 */
export const getSellerStatus = async () => {
  try {
    const { data } = await api.get('/api/seller-apply/me');
    return data;
  } catch (error) {
    // 204 No Content 응답을 받았을 경우, 신청 내역이 없는 것으로 처리
    if (error.response && error.response.status === 204) {
      return null;
    }
    // 그 외 에러는 다시 throw
    throw error;
  }
};