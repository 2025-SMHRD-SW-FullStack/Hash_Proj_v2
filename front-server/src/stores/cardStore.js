// src/stores/cartStore.js

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      // state: 장바구니 아이템 배열
      items: [],

      // actions: 상태 변경 함수
      /**
       * 장바구니에 상품을 추가합니다. 동일한 옵션의 상품이 이미 있다면 수량만 더합니다.
       * @param {object} newItem - { productId, variantId, quantity, name, brand, thumbnailUrl, price, addPrice, option1Value, option2Value }
       */
      addToCart: (newItem) => {
        const items = get().items;
        const existingItemIndex = items.findIndex(
          (item) => item.variantId === newItem.variantId
        );

        if (existingItemIndex > -1) {
          // 이미 있는 상품이면 수량만 증가
          const updatedItems = [...items];
          updatedItems[existingItemIndex].quantity += newItem.quantity;
          set({ items: updatedItems });
        } else {
          // 새로운 상품이면 배열에 추가
          set({ items: [...items, newItem] });
        }
      },

      /**
       * 장바구니에서 특정 상품(variantId 기준)을 제거합니다.
       * @param {number} variantId - 제거할 상품의 variantId
       */
      removeFromCart: (variantId) => {
        set({
          items: get().items.filter((item) => item.variantId !== variantId),
        });
      },

      /**
       * 특정 상품의 수량을 업데이트합니다.
       * @param {number} variantId - 수량을 변경할 상품의 variantId
       * @param {number} newQuantity - 새로운 수량
       */
      updateQuantity: (variantId, newQuantity) => {
        set({
          items: get().items.map((item) =>
            item.variantId === variantId ? { ...item, quantity: Math.max(1, newQuantity) } : item
          ),
        });
      },

      /**
       * 장바구니를 비웁니다.
       */
      clearCart: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'cart-storage', // localStorage에 저장될 키 이름
    }
  )
);

export default useCartStore;