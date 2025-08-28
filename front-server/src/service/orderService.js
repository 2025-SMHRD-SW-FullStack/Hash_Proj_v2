import api from "../config/axiosInstance";

/** 주문 체크아웃 생성 */
export const checkout = (payload) =>
  api.post("/api/orders/checkout", payload).then((res) => res.data);
