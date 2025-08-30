import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from "../../../components/common/Button";
import useCartStore from '../../../stores/cartStore'; // ✅ 서버 서비스 대신 로컬 스토어 사용
import Icon from '../../../components/common/Icon';
import Minus from '../../../assets/icons/ic_minus.svg';
import Plus from '../../../assets/icons/ic_plus.svg';
import Delete from '../../../assets/icons/ic_delete.svg';
import TestImg from '../../../assets/images/ReSsol_TestImg.png'; // 썸네일 없을 때를 위한 이미지

const SHIPPING_FEE_PER_SELLER = 3000;

export default function MyCartPage() {
  const navi = useNavigate();
  
  // ✅ cartService 대신 useCartStore에서 상태와 함수를 가져옵니다.
  const { items, updateQuantity, removeFromCart, clearCart } = useCartStore();

  const [selectedIds, setSelectedIds] = useState(new Set());

  // ✅ items 목록이 바뀔 때마다 모든 상품을 기본으로 선택하도록 합니다.
  useEffect(() => {
    setSelectedIds(new Set(items.map(it => it.variantId)));
  }, [items]);

  /** 장바구니 내 서로 다른 셀러 수 (로컬 스토어에서는 sellerId가 없으므로 1로 간주) */
  const distinctSellerCount = useMemo(() => {
    if (items.length === 0) return 0;
    const sellerIds = new Set(items.map(item => item.sellerId || 1));
    return sellerIds.size;
  }, [items]);

  /** 선택된 아이템 목록 */
  const selectedItems = useMemo(() => {
    return items.filter(item => selectedIds.has(item.variantId));
  }, [items, selectedIds]);

  /** 합계(아이템) */
  const itemsTotal = useMemo(() => {
    return selectedItems.reduce((sum, r) => {
      const unit = Number(r?.price ?? 0) + Number(r?.addPrice ?? 0);
      const qty  = Number(r?.quantity ?? 0);
      return sum + unit * qty;
    }, 0);
  }, [selectedItems]);
  
  /** 배송비 계산 */
  const computedShippingFee = useMemo(() => {
    if (selectedItems.length === 0) return 0;
    return SHIPPING_FEE_PER_SELLER * Math.max(1, distinctSellerCount);
  }, [selectedItems, distinctSellerCount]);
  
  /** 최종 결제 예정 금액 */
  const computedPayableBase = useMemo(() => {
    return itemsTotal + computedShippingFee;
  }, [itemsTotal, computedShippingFee]);

  const canCheckout = useMemo(() => selectedItems.length > 0, [selectedItems]);

  // --- 이벤트 핸들러 ---

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(items.map(it => it.variantId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (variantId) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(variantId)) {
      newIds.delete(variantId);
    } else {
      newIds.add(variantId);
    }
    setSelectedIds(newIds);
  };
  
  const onQtyChange = (variantId, newQuantity) => {
    if (newQuantity < 1) return;
    updateQuantity(variantId, newQuantity);
  };
  
  const onRemove = (variantId) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    removeFromCart(variantId);
  };

  const onClear = () => {
    if (!confirm("장바구니를 모두 비울까요?")) return;
    clearCart();
  };

  const onCheckout = () => {
    if (!canCheckout) return;

    // ✅ 주문 페이지로 선택된 상품 정보를 넘겨줍니다.
    const firstProductId = selectedItems[0].productId;
    if (selectedItems.some(item => item.productId !== firstProductId)) {
        alert('현재는 동일한 상품의 옵션들만 한번에 주문이 가능합니다.');
        return;
    }

    const itemsQuery = selectedItems
      .map(item => `${item.variantId}_${item.quantity}`)
      .join(',');
    navi(`/user/order?productId=${firstProductId}&items=${itemsQuery}`);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">장바구니</h1>
        {items.length > 0 && (
          <button onClick={onClear} className="h-9 px-3 rounded-lg border hover:bg-gray-50 text-sm">모두 비우기</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* 리스트 */}
        <div className="rounded-2xl border bg-white">
          {items.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">장바구니가 비어 있습니다.</div>
          ) : (
            <>
              <div className="flex items-center p-4 border-b">
                <input
                  type="checkbox"
                  id="selectAll"
                  className="mr-4"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={handleSelectAll}
                />
                <label htmlFor="selectAll">전체 선택</label>
              </div>
              <ul className="divide-y">
                {items.map(row => (
                  <li key={row.variantId} className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            className="mr-4" 
                            checked={selectedIds.has(row.variantId)} 
                            onChange={() => handleSelectItem(row.variantId)}
                        />
                        <img src={row.thumbnailUrl || TestImg} alt={row.name} className="w-20 h-20 rounded-lg object-cover" />
                        <div className="ml-4">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-xs text-gray-500 break-words">
                                옵션: {row.option1Value} {row.option2Value || ''}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border rounded-md">
                        <button className="px-2 py-1" onClick={() => onQtyChange(row.variantId, row.quantity - 1)}>-</button>
                        <span className="px-3 text-sm">{row.quantity}</span>
                        <button className="px-2 py-1" onClick={() => onQtyChange(row.variantId, row.quantity + 1)}>+</button>
                      </div>
                      <div className="w-28 text-right text-sm font-semibold">
                        {((row.price + (row.addPrice || 0)) * row.quantity).toLocaleString()}원
                      </div>
                      <button className="h-8 px-3 rounded-lg border hover:bg-gray-50 text-sm" onClick={() => onRemove(row.variantId)}>삭제</button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* 요약/CTA */}
        <div className="rounded-2xl border bg-white p-4 h-fit sticky top-6">
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm">
              <span>상품 합계</span>
              <span>{itemsTotal.toLocaleString()}원</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>
                배송비
                {distinctSellerCount > 1 && (
                  <em className="ml-1 text-xs text-gray-500">
                    (셀러 {distinctSellerCount}곳 × 3,000원)
                  </em>
                )}
              </span>
              <span>{computedShippingFee.toLocaleString()}원</span>
            </div>
            <div className="mt-2 border-t pt-2 flex items-center justify-between font-semibold">
              <span>결제 예정금액</span>
              <span>{computedPayableBase.toLocaleString()}원</span>
            </div>
          </div>

          <p className="mb-3 text-xs text-gray-500">
            * 같은 셀러의 다른 상품들은 배송비 1회(3,000원)만 부과됩니다. 셀러가 다르면 배송비가 합산됩니다.
          </p>

          <Button className="w-full" disabled={!canCheckout} onClick={onCheckout}>
            결제하기
          </Button>
        </div>
      </div>
    </div>
  );
}