import api from "../config/axiosInstance";

/** ✅ 주문 체크아웃
 *  - 기본: /api/orders/checkout  (너 백엔드가 이거임)
 *  - 예비: /api/me/orders/checkout, /api/checkout
 *  - 404/405 나오면 다음 후보로 '명시적 continue'
 *  - 필요 시 VITE_CHECKOUT_PATH 로 강제 경로 지정 가능
 */
export const checkout = async (payload) => {
  const forced = (import.meta.env.VITE_CHECKOUT_PATH || "").trim();
  if (forced) {
    const { data } = await api.post(forced, payload);
    return data;
  }

  const urls = [
    "/api/orders/checkout",      // ← 우선 시도 (네 백엔드 기본)
    "/api/me/orders/checkout",
    "/api/checkout",
  ];

  let lastErr;
  for (const url of urls) {
    try {
      const { data } = await api.post(url, payload);
      return data;
    } catch (e) {
      const st = e?.response?.status;
      if (st === 404 || st === 405) { // Method/Path 불일치면 다음 후보로
        lastErr = e;
        continue;
      }
      throw e; // 다른 에러는 즉시 노출
    }
  }
  throw lastErr ?? new Error("No checkout endpoint matched");
};

/** 내 주문 목록 */
export const getMyOrders = () =>
  api.get("/api/me/orders").then(r => r.data);

/** 내 주문 상세 */
export const getMyOrderDetail = (orderId) =>
  api.get(`/api/me/orders/${orderId}`).then(r => r.data);

/** 구매 확정 */
export const confirmPurchase = (orderId) =>
  api.post(`/api/me/orders/${orderId}/confirm`).then(r => r.data);

/** 배송 타임라인(스윗트래커 프록시) */
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

/** 피드백 완료 여부(있으면 true) */
export const checkFeedbackDone = async (orderId) => {
  const urls = [
    `/api/me/orders/${orderId}/feedback/done`,
    `/api/feedbacks/done?orderId=${orderId}`,
    `/api/feedbacks/by-order/${orderId}/done`,
  ];
  for (const url of urls) {
    try {
      const { data } = await api.get(url);
      return Boolean(data?.done ?? data);
    } catch (e) {
      const st = e?.response?.status;
      if (st === 404 || st === 405) continue;
      throw e;
    }
  }
  return false;
};

// (신규) 구매확정/피드백 가능 윈도우 조회
export const getConfirmWindow = (orderId) =>
  api.get(`/api/me/orders/${orderId}/window`).then(r => r.data);



