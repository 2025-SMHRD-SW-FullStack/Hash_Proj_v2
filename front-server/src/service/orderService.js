// /src/service/orderService.js
// axios default export든 named export든 모두 대응
import apiDefault, { axiosInstance as apiNamed } from '/src/config/axiosInstance'
const api = apiDefault ?? apiNamed


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
export const checkFeedbackDone = async (orderItemId) => {
  // orderId가 아닌 orderItemId를 사용하도록 수정합니다.
  if (!orderItemId) return false;
  try {
    // API 경로를 백엔드 컨트롤러에 정의된 '/api/feedbacks/order-item/{id}/done'으로 명확히 지정합니다.
    const { data } = await api.get(`/api/feedbacks/order-item/${orderItemId}/done`);
    return Boolean(data?.done ?? data);
  } catch (e) {
    const st = e?.response?.status;
    // 404 에러는 피드백이 없는 경우일 수 있으므로 false를 반환합니다.
    if (st === 404) return false;
    // 그 외 에러는 로그만 남기고 false 처리하여 UI가 멈추지 않도록 합니다.
    console.error(`Feedback check failed for orderItemId ${orderItemId}:`, e);
    return false;
  }
};

// (신규) 구매확정/피드백 가능 윈도우 조회
export const getConfirmWindow = (orderId) =>
  api.get(`/api/me/orders/${orderId}/window`).then(r => r.data);

/* ─────────────────────────────────────────────────────────────
 *  셀러 주문 (스웨거 확정 경로)
 *  - 목록(그리드): GET  /api/seller/orders/grid
 *  - CSV:        GET  /api/seller/orders/grid/export
 *  - 송장등록:    POST /api/seller/orders/{orderId}/shipments
 *  params: { status, from, to, q, page, size }
 * ──────────────────────────────────────────────────────────── */

/** 목록(그리드) */
export const fetchSellerOrders = async ({
  status, from, to, q, page = 0, size = 20,
} = {}) => {
  const params = { page, size }
  if (status && status !== 'ALL') params.status = status
  if (from) params.from = from          // 'YYYY-MM-DD'
  if (to) params.to = to                // 'YYYY-MM-DD'
  if (q) params.q = q                   // 주문번호/수취인/연락처 등

  const { data } = await api.get('/api/seller/orders/grid', { params })
  return {
    items: data?.content ?? [],
    page: {
      number: data?.number ?? 0,
      size: data?.size ?? (data?.content?.length ?? 0),
      totalElements: data?.totalElements ?? 0,
      totalPages: data?.totalPages ?? 1,
    },
  }
}

/** 송장(배송정보) 등록
 * payload: { carrierCode, carrierName, trackingNo }
 * 백에 따라 courier*를 쓰는 경우가 있어 둘 다 보냄(호환)
 */
export const registerShipment = async (orderId, {
  carrierCode, carrierName, trackingNo,
}) => {
  const body = {
    carrierCode, carrierName, trackingNo,
    courierCode: carrierCode, courierName: carrierName, // 호환 필드
  }
  const { data } = await api.post(`/api/seller/orders/${orderId}/shipments`, body)
  return data // Long(등록된 shipment id 등)
}

/** CSV 다운로드 URL (a.href로 사용) */
export const buildOrdersCsvUrl = ({ status, from, to, q } = {}) => {
  const qs = new URLSearchParams()
  if (status && status !== 'ALL') qs.set('status', status)
  if (from) qs.set('from', from)
  if (to) qs.set('to', to)
  if (q) qs.set('q', q)
  return `/api/seller/orders/grid/export${qs.toString() ? `?${qs.toString()}` : ''}`
}

/** CSV 다운로드(Blob이 필요한 경우) */
export const exportSellerOrdersCSV = async (params = {}) => {
  const { data } = await api.get('/api/seller/orders/grid/export', {
    params,
    responseType: 'blob',
  })
  return data
}

/** 배송 추적(주문ID 기준) */
export const fetchTracking = async (orderId) => {
  const { data } = await api.get(`/api/shipments/${orderId}/tracking`)
  return data
}

/** (구버전 호환) /api/seller/orders 호출하던 코드 방어용 */
export const getSellerOrders = async (params = {}) => {
  try {
    const { data } = await api.get('/api/seller/orders/grid', { params })
    return data?.content ?? []
  } catch (e) {
    console.warn('getSellerOrders() fallback -> []', e?.response?.status, e?.message)
    return []
  }
}
