import axiosInstance from '../config/axiosInstance';

/**
 * ✅ 현재 로그인한 사용자의 포인트 잔액을 조회하는 API 함수
 * @returns {Promise<number>} 포인트 잔액
 */
export const getMyPointBalance = async () => {
  try {
    const response = await axiosInstance.get('/api/me/points/balance');
    // response.data는 { balance: 2000 } 형태일 것이므로 .balance로 접근
    return response.data.balance;
  } catch (error) {
    console.error("포인트 잔액 조회 API 연동 실패:", error);
    throw error;
  }
};