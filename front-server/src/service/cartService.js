import api from "../config/axiosInstance";

/** 장바구니 조회 */
export const getCart = async () => {
  const { data } = await api.get("/api/me/cart");
  return data; // { items[], totalPrice, shippingFee, payableBase }
};

/** 담기 */
export const addCartItem = async ({ productId, qty, options }) => {
  // options: 라벨→값 맵 (예: {"색깔":"레드","사이즈":"XL"})
  const body = { productId, qty, options };
  const { data } = await api.post("/api/me/cart/items", body);
  return data;
};

/** 수량 변경 */
export const updateCartItemQty = async (cartItemId, qty) => {
  const { data } = await api.put(`/api/me/cart/items/${cartItemId}`, { qty });
  return data;
};

/** 단건 삭제 */
export const removeCartItem = async (cartItemId) => {
  const { data } = await api.delete(`/api/me/cart/items/${cartItemId}`);
  return data;
};

/** 전체 비우기 */
export const clearCart = async () => {
  const { data } = await api.delete("/api/me/cart");
  return data;
};

/** 장바구니 결제(주문 생성) */
export const checkoutCart = async ({
  addressId,
  requestMemo,
  useAllPoint,
  usePoint,
  clearCartAfter = true,
  cartItemIds,           // ⬅️ 추가: 선택 결제용 cartItemId 배열
}) => {
  const body = { addressId, requestMemo, useAllPoint, usePoint, clearCartAfter };
  // 선택 결제일 때만 주입 (서버 구현에 따라 'items' 또는 'cartItemIds'를 읽음)
  if (Array.isArray(cartItemIds) && cartItemIds.length) {
    body.items = cartItemIds;       // 서버가 items를 기대하는 경우
    body.cartItemIds = cartItemIds; // 서버가 cartItemIds를 기대하는 경우(잔여 호환)
  }
  const { data } = await api.post("/api/me/checkout/cart", body);
  // data: { orderDbId, orderId, totalPrice, shippingFee, usedPoint, payAmount }
  return data;
};
