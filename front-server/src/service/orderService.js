// src/service/orderService.js
import api from "../config/axiosInstance";

/** ✅ 주문 체크아웃: 주문 생성 + 결제금액/주문번호 반환
 *  백엔드 엔드포인트가 레포마다 조금 달 수 있어
 *  /api/orders/checkout -> /api/me/orders/checkout -> /api/checkout 순으로 시도
 */
export const checkout = async (payload) => {
  const candidates = [
    "/api/orders/checkout",
    "/api/me/orders/checkout",
    "/api/checkout",
  ];
  let lastErr;
  for (const path of candidates) {
    try {
      const { data } = await api.post(path, payload);
      return data; // { orderUid, orderId?, payAmount, ... }
    } catch (e) {
      lastErr = e;
      const st = e?.response?.status;
      // 경로가 다르면 다음 후보 시도, 그 외는 바로 throw
      if (st !== 404 && st !== 405) throw e;
    }
  }
  throw lastErr;
};

/** 내 주문 목록 */
export const getMyOrders = () =>
  api.get("/api/me/orders").then((r) => r.data);

/** 내 주문 상세 */
export const getMyOrderDetail = (orderId) =>
  api.get(`/api/me/orders/${orderId}`).then((r) => r.data);

/** 구매 확정 */
export const confirmPurchase = (orderId) =>
  api.post(`/api/me/orders/${orderId}/confirm`).then((r) => r.data);

/** 배송 조회(스윗트래커 프록시)
 *  프로젝트마다 경로가 tracking/timeline 다를 수 있어 둘 다 시도
 */
export const getTracking = async (orderId) => {
  try {
    const { data } = await api.get(`/api/me/orders/${orderId}/tracking`);
    return data;
  } catch (e) {
    const st = e?.response?.status;
    if (st === 404 || st === 405) {
      const { data } = await api.get(`/api/me/orders/${orderId}/timeline`);
      return data;
    }
    throw e;
  }
};
