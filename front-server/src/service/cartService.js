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
export const checkoutCart = async ({ addressId, requestMemo, useAllPoint, usePoint, clearCartAfter = true }) => {
  const body = { addressId, requestMemo, useAllPoint, usePoint, clearCartAfter };
  const { data } = await api.post("/api/me/checkout/cart", body);
  // data: { orderDbId, orderId, totalPrice, shippingFee, usedPoint, payAmount }
  return data;
};
