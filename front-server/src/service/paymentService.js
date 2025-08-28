import api from "../config/axiosInstance";

// 서버 confirm: 0원 결제도 여기로 호출해 finalize 처리
export const confirmTossPayment = (payload) =>
  api.post("/api/payments/toss/confirm", payload).then((r) => r.data);
