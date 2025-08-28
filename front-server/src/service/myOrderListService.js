import axiosInstance from '../config/axiosInstance';

/**
 * 마이 페이지 주문 목록 조회하는 API 함수
 * @returns {Promise<Array>} 주문 목록 배열
 */
export const getMyOrderList = async () => {
  try {
    const response = await axiosInstance.get('/api/me/orders');
    return response.data;
  } catch (error) {
    console.error("마이 페이지 주문 목록 조회 API 연동 실패:", error);
    throw error;
  }
};