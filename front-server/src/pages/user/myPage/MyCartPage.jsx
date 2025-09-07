import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from "../../../components/common/Button";
import MinusIcon from '../../../assets/icons/ic_minus.svg';
import PlusIcon from '../../../assets/icons/ic_plus.svg';
import TestImg from '../../../assets/images/ReSsol_TestImg.png';
import { getCart, updateCartItemQty, removeCartItem, clearCart } from '../../../service/cartService';
import Icon from '../../../components/common/Icon';
import CloseIcon from '../../../assets/icons/ic_close.svg'

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
      return parts.length ? `${parts.join(' · ')}` : ''
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

  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-6xl mx-auto w-full ">
        <h1 className="hidden md:block text-lg md:text-xl font-bold mb-4 text-gray-800">장바구니</h1>

        {/* 리스트 */}
        <div className="rounded-2xl border ">
          {items.length === 0 ? (
            <div className="rounded-lg p-4 h-60 flex items-center justify-center text-gray-400">장바구니가 비어 있습니다.</div>
          ) : (
            <div className='rounded-lg bg-white'>
              <div className="flex items-center justify-between p-4 border-b text-sm">
                <div className='flex items-center'>
                  <input
                    type="checkbox"
                    id="selectAll"
                    className="mr-2"
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onChange={handleSelectAll}
                  />
                  <label htmlFor="selectAll" className='text-base' >
                    전체 선택 ({selectedIds.size}/{items.length})
                  </label>
                </div>
                {items.length > 0 && (
                  <Button
                    variant='unselected'
                    onClick={onClear}
                    className='text-red-500 sm:hover:bg-red-500 sm:hover:text-white'
                  >
                    모두 비우기
                  </Button>
                )}
              </div>

              <ul className="divide-y pl-0">
                    {items.map(row => (
                      <li
                        key={row.cartItemId}
                        className="p-4 flex items-center space-x-3 sm:space-x-4"
                      >
                        {/* === 체크박스 & 이미지 === */}
                        <div className="flex-shrink-0 flex items-center">
                          <input
                            type="checkbox"
                            className="mr-2 sm:mr-3"
                            checked={selectedIds.has(row.cartItemId)}
                            onChange={() => handleSelectItem(row.cartItemId)}
                          />
                          <img
                            src={row.thumbnailUrl || TestImg}
                            alt={row.productName}
                            className="w-20 h-20 rounded-lg object-cover"
                            onError={(e) => {
                              e.target.onerror = null; // 무한 루프 방지
                              e.target.src = TestImg;
                            }}
                          />
                        </div>

                        {/* === 상품 정보, 수량, 가격, 삭제 버튼 컨테이너 === */}
                        <div className="flex-grow flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          
                          {/* 1. 상품명 & 옵션 */}
                          <div className="flex-grow space-y-1">
                            <span className="font-medium text-base">{row.productName}</span>
                            <p className="text-xs text-gray-500 break-words">
                              {formatOptionsText(row.optionsJson)}
                            </p>
                            {!row.inStock && (
                              <div className="text-xs text-red-600 mt-1">
                                품절 또는 재고 부족
                              </div>
                            )}
                          </div>

                          {/* 2. [모바일용] 옵션, 수량, 가격 묶음 */}
                          <div className="sm:hidden flex items-center justify-between mt-2">
                            <div className="w-fit flex items-center border-[#CCC] border-solid rounded-md border-[1.5px] overflow-hidden">
                              <button
                                className="px-2 py-1 bg-transparent border-none hover:bg-gray-100"
                                onClick={() => onQtyChange(row.cartItemId, row.qty - 1)}
                              >
                                <Icon src={MinusIcon} alt="-" className="!w-3 !h-3" />
                              </button>
                              <span className="px-3 py-1 text-sm">{row.qty}</span>
                              <button
                                className="px-2 py-1 bg-transparent border-none hover:bg-gray-100"
                                onClick={() => onQtyChange(row.cartItemId, row.qty + 1)}
                              >
                                <Icon src={PlusIcon} alt="+" className="!w-3 !h-3" />
                              </button>
                            </div>
                            <span className="font-semibold text-base ml-2">
                              {row.subtotal.toLocaleString()}원
                            </span>
                          </div>
                          
                          {/* 3. [데스크탑용] 수량, 가격, 삭제버튼 */}
                          <div className="hidden sm:flex items-center space-x-6 md:space-x-8">
                              {/* 수량 */}
                              <div className="w-fit flex items-center border-[#CCC] border-solid rounded-md border-[1.5px] overflow-hidden">
                                <button
                                  className="px-2 py-1 bg-transparent border-none hover:bg-gray-100"
                                  onClick={() => onQtyChange(row.cartItemId, row.qty - 1)}
                                >
                                  <Icon src={MinusIcon} alt="-" className="!w-3 !h-3" />
                                </button>
                                <span className="px-3 py-1 text-sm">{row.qty}</span>
                                <button
                                  className="px-2 py-1 bg-transparent border-none hover:bg-gray-100"
                                  onClick={() => onQtyChange(row.cartItemId, row.qty + 1)}
                                >
                                  <Icon src={PlusIcon} alt="+" className="!w-3 !h-3" />
                                </button>
                              </div>
                              {/* 가격 */}
                              <div className="w-24 text-right text-base font-semibold">
                                {row.subtotal.toLocaleString()}원
                              </div>
                              {/* 삭제 버튼 */}
                              <Button
                                variant='danger'
                                className='bg-red-500/40 hover:bg-red-500'
                                onClick={() => onRemove(row.cartItemId)}
                              >
                                삭제
                              </Button>
                          </div>

                        </div>
                        
                        {/* 4. [모바일용] 삭제 아이콘 */}
                        <div className="sm:hidden flex-shrink-0">
                          <Button
                              variant='outline'
                              className='border-none'
                              onClick={() => onRemove(row.cartItemId)}
                              leftIcon={<img src={CloseIcon} alt='삭제' className='!w-5 !h-5'/>}
                            />
                        </div>

                      </li>
                    ))}
                  </ul>
            </div>
          )}
        </div>
      </div>

      {/* 하단 고정 푸터 */}
      <footer className="sticky bottom-0 left-0 right-0 border-t border-[#CCC] border-[1] bg-white shadow-md sm:mx-16 rounded-md ">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
          {/* 금액 정보 */}
          <div className="flex flex-col text-sm sm:flex-row sm:items-center sm:gap-8 sm:text-base">
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
      </footer>
    </div>
  );
}

export default MyCartPage