import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from "../../../components/common/Button";
import MinusIcon from '../../../assets/icons/ic_minus.svg';
import PlusIcon from '../../../assets/icons/ic_plus.svg';
import TestImg from '../../../assets/images/ReSsol_TestImg.png';
import { getCart, updateCartItemQty, removeCartItem, clearCart } from '../../../service/cartService';

const SHIPPING_FEE_PER_SELLER  = 3000;

// 빈 옵션이면 공백, 있으면 "(색상: 핑크 · 사이즈: M)" 형태로
const formatOptionsText = (optionsJson) => {
  if (!optionsJson) return ''
  try {
    const data = typeof optionsJson === 'string' ? JSON.parse(optionsJson) : optionsJson
    if (!data) return ''

    if (Array.isArray(data)) {
      const parts = data.map(it => {
        if (!it) return ''
        if (typeof it === 'string') return it
        const name = it.name ?? it.optionName ?? it.key ?? ''
        const value = it.value ?? it.optionValue ?? ''
        const text = [name, value].filter(Boolean).join(': ')
        return text
      }).filter(Boolean)
      return parts.length ? `(${parts.join(' · ')})` : ''
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data)
      if (!keys.length) return ''
      const parts = keys.map(k => (data[k] ? `${k}: ${data[k]}` : '')).filter(Boolean)
      return parts.length ? `(${parts.join(' · ')})` : ''
    }

    return ''
  } catch {
    return ''
  }
}

const MyCartPage = () => {
  const navi = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartData, setCartData] = useState({ items: [], totalPrice: 0, shippingFee: 0 });
  const [selectedIds, setSelectedIds] = useState(new Set());

  // 옵션 JSON을 파싱하여 표시 가능한 문자열로 변환하는 헬퍼 함수
  const getOptionsString = (optionsJson) => {
    if (!optionsJson) return null;
    try {
      const options = JSON.parse(optionsJson);
      const values = Object.values(options).filter(Boolean); // null이나 빈 문자열 값 제외
      if (values.length === 0 || (values.length === 1 && values[0] === '기본')) {
        return null; // 의미 없는 옵션은 표시하지 않음
      }
      return values.join(' / ');
    } catch (e) {
      return null; // JSON 파싱 실패 시 표시하지 않음
    }
  };

  const fetchCart = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCart();
      setCartData(data || { items: [], totalPrice: 0, shippingFee: 0 });
      setSelectedIds(new Set((data?.items || []).map(it => it.cartItemId)));
    } catch (err) {
      setError("장바구니 정보를 불러오는 데 실패했습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const items = cartData.items || [];

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.has(item.cartItemId)),
    [items, selectedIds]
  );

  const itemsTotal = useMemo(
    () => selectedItems.reduce((sum, r) => sum + r.subtotal, 0),
    [selectedItems]
  );

  // 셀러 카운트 계산
  const distinctSellerCount = useMemo(() => {
    const ids = selectedItems.map(it => it.sellerId).filter(Boolean);
    return new Set(ids).size || 1; // sellerId 없으면 최소 1
  }, [selectedItems]);

  const computedShippingFee = useMemo(() => {
    console.log("Recalculating shipping fee...");
    console.log("Selected items:", selectedItems);
    if (selectedItems.length === 0) return 0;

    // 무형자산 포함 → 배송비 0원 (이제 it.category에 접근 가능)
    // const hasIntangible = selectedItems.some(it => it.category === "무형자산");
    // if (hasIntangible) return 0;

    // 위 코드를 gpt가 이걸로 바꾸라해서 바꿈 확인 바람
    const allIntangible = selectedItems.every(it => it.category === "무형자산");
    if (allIntangible) return 0;

    // 기본 로직 (셀러 수 × 3000)
    return SHIPPING_FEE_PER_SELLER * Math.max(1, distinctSellerCount);
  }, [selectedItems, cartData.shippingFee]);

  const computedPayableBase = useMemo(
    () => itemsTotal + computedShippingFee,
    [itemsTotal, computedShippingFee]
  );

  const canCheckout = useMemo(() => selectedItems.length > 0, [selectedItems]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(items.map(it => it.cartItemId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (cartItemId) => {
    const newIds = new Set(selectedIds);
    newIds.has(cartItemId) ? newIds.delete(cartItemId) : newIds.add(cartItemId);
    setSelectedIds(newIds);
  };

  const onQtyChange = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await updateCartItemQty(cartItemId, newQuantity);
      await fetchCart();
    } catch {
      alert("수량 변경에 실패했습니다.");
    }
  };

  const onRemove = async (cartItemId) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    try {
      await removeCartItem(cartItemId);
      await fetchCart();
    } catch {
      alert("상품 삭제에 실패했습니다.");
    }
  };

  const onClear = async () => {
    if (!confirm("장바구니를 모두 비울까요?")) return;
    try {
      await clearCart();
      await fetchCart();
    } catch {
      alert("장바구니 비우기에 실패했습니다.");
    }
  };

  const onCheckout = () => {
    if (!canCheckout) return;
    // 숫자 정규화 (문자 섞여도 안전)
    const ids = Array.from(selectedIds)
      .map(v => Number(v))
      .filter(n => Number.isFinite(n));
    const qs = ids.length ? `&items=${ids.join(',')}` : '';
    navi(`/user/order?mode=cart${qs}`);
  }

  if (loading) return <div className="p-4">장바구니를 불러오는 중...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-6xl mx-auto w-full pb-36">
        {/* 헤더 */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">장바구니</h1>
          {items.length > 0 && (
            <button
              onClick={onClear}
              className="text-sm text-red-500 hover:underline"
            >
              모두 비우기
            </button>
          )}
        </div>

        {/* 리스트 */}
        <div className="rounded-2xl border bg-white">
          {items.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">장바구니가 비어 있습니다.</div>
          ) : (
            <>
              <div className="flex items-center p-4 border-b text-sm">
                <input
                  type="checkbox"
                  id="selectAll"
                  className="mr-2"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={handleSelectAll}
                />
                <label htmlFor="selectAll">
                  전체 선택 ({selectedIds.size}/{items.length})
                </label>
              </div>

              <ul className="divide-y">
                {items.map(row => (
                  <li
                    key={row.cartItemId}
                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    {/* 상품 정보 */}
                    <div className="flex items-start sm:items-center">
                      <input
                        type="checkbox"
                        className="mt-1 mr-3"
                        checked={selectedIds.has(row.cartItemId)}
                        onChange={() => handleSelectItem(row.cartItemId)}
                      />
                      <img
                        src={row.thumbnailUrl || TestImg}
                        alt={row.productName}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.onerror = null; // 무한 루프 방지
                          e.target.src = TestImg;
                        }}
                      />
                      <div className="ml-4 flex flex-col">
                        <div className="font-medium text-sm">{row.productName}</div>
                        <div className="text-xs text-gray-500 break-words">
                          {formatOptionsText(row.optionsJson)}
                        </div>
                        {!row.inStock && (
                          <div className="text-xs text-red-600 mt-1">
                            품절 또는 재고 부족
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 수량 & 가격 */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="flex items-center border rounded-lg overflow-hidden">
                        <button
                          className="p-2 hover:bg-gray-50"
                          onClick={() => onQtyChange(row.cartItemId, row.qty - 1)}
                        >
                          <img src={MinusIcon} alt="-" className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-sm">{row.qty}</span>
                        <button
                          className="p-2 hover:bg-gray-50"
                          onClick={() => onQtyChange(row.cartItemId, row.qty + 1)}
                        >
                          <img src={PlusIcon} alt="+" className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="w-24 text-right text-sm font-semibold">
                        {row.subtotal.toLocaleString()}원
                      </div>
                      <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => onRemove(row.cartItemId)}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* 하단 고정 푸터 */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white shadow-lg">
        <div className="max-w-6xl mx-auto w-full px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* 금액 정보 */}
          <div className="flex flex-col text-sm sm:flex-row sm:items-center sm:gap-6">
            <div className="flex justify-between sm:gap-2">
              <span className="text-gray-600">상품 합계</span>
              <span className="font-medium ml-2">{itemsTotal.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between sm:gap-2">
              <span className="text-gray-600">배송비</span>
              <span className="font-medium ml-2">{computedShippingFee.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between sm:gap-2 font-semibold text-base">
              <span>결제 예정금액</span>
              <span className="ml-2">{computedPayableBase.toLocaleString()}원</span>
            </div>
          </div>

          {/* 결제 버튼 */}
          <Button
            className="w-full sm:w-56 h-12 text-base"
            disabled={!canCheckout}
            onClick={onCheckout}
          >
            결제하기
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MyCartPage