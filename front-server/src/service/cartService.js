// src/service/cartService.js
import api from "../config/axiosInstance";

/** 응답을 항상 동일한 형태로 정규화 */
const normalizeCart = (raw) => {
  // 백이 { data: {...} } 로 감싼 경우 벗김
  const root1 = raw?.data ?? raw ?? {};
  // 백이 { data: { cart: {...} } } 로 보내는 경우도 커버
  const root2 = root1.cart ?? root1.data ?? root1.payload ?? root1;

  const itemsSrc =
    root2.items ??
    root2.cartItems ??
    root2.content ??
    root2.list ??
    [];

  const items = (Array.isArray(itemsSrc) ? itemsSrc : []).map((it) => {
    const qty = it.qty ?? it.quantity ?? it.count ?? 1;
    const unitPrice = it.unitPrice ?? it.price ?? 0;
    const subtotal =
      it.subtotal ??
      it.itemTotal ??
      it.total ??
      unitPrice * qty;

    return {
      cartItemId: it.cartItemId ?? it.id ?? it.itemId,
      productName: it.productName ?? it.productNameSnapshot ?? it.name,
      thumbnailUrl: it.thumbnailUrl ?? it.thumbnail ?? it.imageUrl,
      qty,
      subtotal,
      inStock: it.inStock ?? it.available ?? true,
      optionsJson: it.optionsJson ?? it.options ?? null, // 문자열/객체 둘 다 허용
    };
  });

  const shippingFee =
    root2.shippingFee ?? root2.deliveryFee ?? 3000;

  const totalPrice =
    root2.totalPrice ??
    items.reduce((s, r) => s + (r.subtotal || 0), 0);

  const payableBase =
    root2.payableBase ?? totalPrice + shippingFee;

  return { items, totalPrice, shippingFee, payableBase };
};

/** 장바구니 조회 */
export const getCart = async () => {
  const res = await api.get("/api/me/cart");
  // 디버깅이 필요하면 아래 주석을 잠깐 해제
  console.log('[getCart raw]', res.status, res.data);
  return normalizeCart(res.data);
};

/** 담기 */
export const addCartItem = async ({ productId, qty, options }) => {
  const res = await api.post("/api/me/cart/items", { productId, qty, options });
  return res?.data?.data ?? res?.data ?? null;
};

/** 수량 변경 */
export const updateCartItemQty = async (cartItemId, qty) => {
  const res = await api.put(`/api/me/cart/items/${cartItemId}`, { qty });
  return res?.data?.data ?? res?.data ?? null;
};

/** 단건 삭제 */
export const removeCartItem = async (cartItemId) => {
  const res = await api.delete(`/api/me/cart/items/${cartItemId}`);
  return res?.data?.data ?? res?.data ?? null;
};

/** 전체 비우기 */
export const clearCart = async () => {
  const res = await api.delete("/api/me/cart");
  return res?.data?.data ?? res?.data ?? null;
};

/**
 * 장바구니 결제(주문 생성)
 * 선택 결제면 cartItemIds 배열을 같이 넘겨.
 */
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
