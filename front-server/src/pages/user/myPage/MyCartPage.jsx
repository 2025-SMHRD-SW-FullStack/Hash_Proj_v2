import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from "../../../components/common/Button";
import Icon from '../../../components/common/Icon';
import Minus from '../../../assets/icons/ic_minus.svg';
import Plus from '../../../assets/icons/ic_plus.svg';
import Delete from '../../../assets/icons/ic_delete.svg';
import TestImg from '../../../assets/images/ReSsol_TestImg.png';
// ✅ 서버 API 서비스를 사용하도록 수정
import { getCart, updateCartItemQty, removeCartItem, clearCart } from '../../../service/cartService';

const SHIPPING_FEE = 3000;

export default function MyCartPage() {
  const navi = useNavigate();
  
  // ✅ 로컬 스토어 대신 서버 상태를 사용하도록 변경
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartData, setCartData] = useState({ items: [], totalPrice: 0, shippingFee: 0 });
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ✅ 서버에서 장바구니 데이터를 불러오는 함수
  const fetchCart = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCart();
      setCartData(data || { items: [], totalPrice: 0, shippingFee: 0 });
      // 불러온 모든 상품을 기본으로 선택
      setSelectedIds(new Set((data?.items || []).map(it => it.cartItemId)));
    } catch (err) {
      setError("장바구니 정보를 불러오는 데 실패했습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 페이지 로드 시 장바구니 데이터 불러오기
  useEffect(() => {
    fetchCart();
  }, []);

  const items = cartData.items || [];

  /** 선택된 아이템 목록 */
  const selectedItems = useMemo(() => {
    return items.filter(item => selectedIds.has(item.cartItemId));
  }, [items, selectedIds]);

  /** 합계(아이템) */
  const itemsTotal = useMemo(() => {
    return selectedItems.reduce((sum, r) => sum + r.subtotal, 0);
  }, [selectedItems]);
  
  /** 배송비 계산 */
  const computedShippingFee = useMemo(() => {
    if (selectedItems.length === 0) return 0;
    // (셀러별 배송비 로직은 서버에서 계산된 값을 그대로 사용)
    return cartData.shippingFee || SHIPPING_FEE;
  }, [selectedItems, cartData.shippingFee]);
  
  /** 최종 결제 예정 금액 */
  const computedPayableBase = useMemo(() => {
    return itemsTotal + computedShippingFee;
  }, [itemsTotal, computedShippingFee]);

  const canCheckout = useMemo(() => selectedItems.length > 0, [selectedItems]);

  // --- 이벤트 핸들러 (서버 API 호출로 변경) ---

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(items.map(it => it.cartItemId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (cartItemId) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(cartItemId)) {
      newIds.delete(cartItemId);
    } else {
      newIds.add(cartItemId);
    }
    setSelectedIds(newIds);
  };
  
  const onQtyChange = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await updateCartItemQty(cartItemId, newQuantity);
      await fetchCart(); // 변경 후 목록 새로고침
    } catch (error) {
      alert("수량 변경에 실패했습니다.");
    }
  };
  
  const onRemove = async (cartItemId) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    try {
        await removeCartItem(cartItemId);
        await fetchCart(); // 삭제 후 목록 새로고침
    } catch (error) {
        alert("상품 삭제에 실패했습니다.");
    }
  };

  const onClear = async () => {
    if (!confirm("장바구니를 모두 비울까요?")) return;
    try {
        await clearCart();
        await fetchCart(); // 비운 후 목록 새로고침
    } catch (error) {
        alert("장바구니 비우기에 실패했습니다.");
    }
  };
  
  // ✅ 주문하기 페이지로 이동 (서버 데이터를 기반으로)
  const onCheckout = () => {
    if (!canCheckout) return;
    // 장바구니 전체를 주문하는 것이므로, 별도 파라미터 없이 이동
    navi('/user/order?mode=cart');
  };

  if (loading) return <div className="p-4">장바구니를 불러오는 중...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

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
                <label htmlFor="selectAll">전체 선택 ({selectedIds.size}/{items.length})</label>
              </div>
              <ul className="divide-y">
                {items.map(row => (
                  <li key={row.cartItemId} className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            className="mr-4" 
                            checked={selectedIds.has(row.cartItemId)} 
                            onChange={() => handleSelectItem(row.cartItemId)}
                        />
                        <img src={row.thumbnailUrl || TestImg} alt={row.productName} className="w-20 h-20 rounded-lg object-cover" />
                        <div className="ml-4">
                            <div className="font-medium">{row.productName}</div>
                            <div className="text-xs text-gray-500 break-words">
                                {row.optionsJson}
                            </div>
                             {!row.inStock && (
                                <div className="text-xs text-red-600 mt-1">품절 또는 재고 부족</div>
                             )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border rounded-md">
                        <button className="px-2 py-1" onClick={() => onQtyChange(row.cartItemId, row.qty - 1)}>-</button>
                        <span className="px-3 text-sm">{row.qty}</span>
                        <button className="px-2 py-1" onClick={() => onQtyChange(row.cartItemId, row.qty + 1)}>+</button>
                      </div>
                      <div className="w-28 text-right text-sm font-semibold">
                        {(row.subtotal).toLocaleString()}원
                      </div>
                      <button className="h-8 px-3 rounded-lg border hover:bg-gray-50 text-sm" onClick={() => onRemove(row.cartItemId)}>삭제</button>
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
              <span>배송비</span>
              <span>{computedShippingFee.toLocaleString()}원</span>
            </div>
            <div className="mt-2 border-t pt-2 flex items-center justify-between font-semibold">
              <span>결제 예정금액</span>
              <span>{computedPayableBase.toLocaleString()}원</span>
            </div>
          </div>

          <Button className="w-full" disabled={!canCheckout} onClick={onCheckout}>
            결제하기
          </Button>
        </div>
      </div>
    </div>
  );
}