import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/common/Button";
import {
  getCart, updateCartItemQty, removeCartItem, clearCart
} from "../../../service/cartService";
import TestImg from "../../../assets/images/ReSsol_TestImg.png";

const SHIPPING_FEE = 3000;

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

export default function MyCartPage() {
  const navi = useNavigate();

  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const reload = async () => {
    setLoading(true);
    try {
      const data = await getCart();
      setCart(data || { items: [] });
      // 기본적으로 전체 선택
      setSelectedIds(new Set((data?.items ?? []).map(it => it.cartItemId)));
      return data;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const items = cart?.items ?? [];
  const selectedItems = useMemo(
    () => items.filter(it => selectedIds.has(it.cartItemId)),
    [items, selectedIds]
  );

  /** 셀러 수 (선택된 상품 기준) */
  const distinctSellerCount = useMemo(() => {
    if (selectedItems.length === 0) return 0;
    const ids = new Set(
      selectedItems
        .map(r => r?.sellerId ?? r?.sellerID ?? r?.seller ?? r?.ownerId ?? null)
        .filter(v => v !== null && v !== undefined)
    );
    return ids.size > 0 ? ids.size : 1;
  }, [selectedItems]);

  /** 합계 (선택된 상품 기준) */
  const itemsTotal = useMemo(() => {
    if (selectedItems.length === 0) return 0;
    return selectedItems.reduce((sum, r) => {
      if (typeof r?.subtotal === "number") return sum + r.subtotal;
      return sum + (Number(r?.unitPrice ?? 0) * Number(r?.qty ?? 0));
    }, 0);
  }, [selectedItems]);

  /** 배송비 계산 로직 */
  const computedShippingFee = useMemo(() => {
    if (selectedItems.length === 0) return 0;

    // 무형자산 포함 → 배송비 0원
    const hasIntangible = selectedItems.some(it => it.category === "무형자산");
    if (hasIntangible) return 0;

    // 기본 로직 (셀러 수 × 3000)
    return SHIPPING_FEE_PER_SELLER * Math.max(1, distinctSellerCount);
  }, [selectedItems, distinctSellerCount]);

  const computedPayableBase = useMemo(
    () => itemsTotal + computedShippingFee,
    [itemsTotal, computedShippingFee]
  );

  const canCheckout = selectedItems.length > 0;

  const handleSelectAll = (checked) => {
    if (checked) {
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

  const onQtyChange = async (row, next) => {
    if (next < 1) return;
    await updateCartItemQty(row.cartItemId, next);
    await reload();
  };

  const onRemove = async (row) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    await removeCartItem(row.cartItemId);
    await reload();
  };

  const onClear = async () => {
    if (!confirm("장바구니를 모두 비울까요?")) return;
    await clearCart();
    await reload();
  };

  const onCheckout = () => {
    if (!canCheckout) return;
    const ids = Array.from(selectedIds)            // Set → Array
    const qs = ids.length ? `&items=${ids.join(',')}` : ''
    navi(`/user/order?mode=cart${qs}`)
  }

  if (loading) return <div className="p-4">장바구니를 불러오는 중...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="hidden md:block text-xl font-semibold">장바구니</h1>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="h-9 px-3 rounded-lg border hover:bg-gray-50 text-sm"
          >
            모두 비우기
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* 리스트 */}
        <div className="rounded-2xl border bg-white">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">불러오는 중…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">장바구니가 비어 있습니다.</div>
          ) : (
            <>
              {/* 전체 선택 */}
              <div className="flex items-center p-4 border-b text-sm">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={e => handleSelectAll(e.target.checked)}
                />
                <span>전체 선택 ({selectedIds.size}/{items.length})</span>
              </div>

              <ul className="divide-y">
                {items.map(row => (
                  <li
                    key={row.cartItemId}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                      !row.inStock ? "bg-red-50" : ""
                    }`}
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
                          e.target.onerror = null;
                          e.target.src = TestImg;
                        }}
                      />
                      <div className="ml-4 flex flex-col">
                        <div className="font-medium text-sm">{row.productName}</div>
                        <div className="text-xs text-gray-500 break-words">
                          {formatOptionsText(row.optionsJson)}
                        </div>
                        {!row.inStock && (
                          <div className="text-xs text-red-600 mt-1">품절 또는 재고 부족</div>
                        )}
                        {row.category === "무형자산" && (
                          <div className="text-xs text-blue-600 mt-1">무형자산 상품 (배송비 없음)</div>
                        )}
                      </div>
                    </div>

                    {/* 수량 & 가격 */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="flex items-center border rounded-lg overflow-hidden">
                        <button
                          className="px-3 py-1 hover:bg-gray-50"
                          onClick={() => onQtyChange(row, row.qty - 1)}
                        >
                          -
                        </button>
                        <span className="px-3 text-sm">{row.qty}</span>
                        <button
                          className="px-3 py-1 hover:bg-gray-50"
                          onClick={() => onQtyChange(row, row.qty + 1)}
                        >
                          +
                        </button>
                      </div>
                      <div className="w-24 text-right text-sm font-semibold">
                        {(row.subtotal ?? (row.unitPrice ?? 0) * (row.qty ?? 0)).toLocaleString()}원
                      </div>
                      <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => onRemove(row)}
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
                {computedShippingFee === 0 && selectedItems.some(it => it.category === "무형자산") ? (
                  <em className="ml-1 text-xs text-blue-500">(무형자산 상품 → 배송비 없음)</em>
                ) : distinctSellerCount > 1 ? (
                  <em className="ml-1 text-xs text-gray-500">(셀러 {distinctSellerCount}곳 × 3,000원)</em>
                ) : null}
              </span>
              <span>{computedShippingFee.toLocaleString()}원</span>
            </div>
            <div className="mt-2 border-t pt-2 flex items-center justify-between font-semibold">
              <span>결제 예정금액</span>
              <span>{computedPayableBase.toLocaleString()}원</span>
            </div>
          </div>

          <Button className="w-full" disabled={!canCheckout || loading} onClick={onCheckout}>
            결제하기
          </Button>
        </div>
      </div>
    </div>
  );
}
