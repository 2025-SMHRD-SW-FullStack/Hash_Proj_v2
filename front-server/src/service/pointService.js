import api from "../config/axiosInstance";

export const getMyPointBalance = () =>
  api.get("/api/me/points/balance").then((r) => r.data?.balance ?? 0);

// 포인트 교환 신청
export const requestPointRedemption = (amount) => 
  api.post('/api/me/points/redemptions', { amount }).then(r => r.data);

// 내 포인트 교환 내역 조회
export const getMyRedemptionHistory = (page = 0, size = 10) =>
  api.get('/api/me/points/redemptions', { params: { page, size } }).then(r => r.data);