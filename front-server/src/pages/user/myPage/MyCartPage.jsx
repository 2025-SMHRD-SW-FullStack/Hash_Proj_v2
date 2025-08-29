import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/common/Button";
import {
  getCart, updateCartItemQty, removeCartItem, clearCart
} from "../../../service/cartService";

const SHIPPING_FEE_PER_SELLER = 3000;

export default function MyCartPage() {
  const navi = useNavigate();

  const [cart, setCart] = useState({ items: [], totalPrice: 0, shippingFee: 0, payableBase: 0 });
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await getCart();
      setCart(data || { items: [], totalPrice: 0, shippingFee: 0, payableBase: 0 });
      return data;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  /** 장바구니 내 서로 다른 셀러 수 */
  const distinctSellerCount = useMemo(() => {
    const items = cart?.items ?? [];
    if (items.length === 0) return 0;

    // 백엔드 응답에서 어떤 키를 쓰는지 상황 방어 (sellerId 우선)
    const ids = new Set(
      items
        .map(r =>
          r?.sellerId ??
          r?.sellerID ??
          r?.seller ??
          r?.ownerId ??
          null
        )
        .filter(v => v !== null && v !== undefined)
    );
    // 만약 키가 아예 없으면 "한 셀러"로 간주
    return ids.size > 0 ? ids.size : 1;
  }, [cart]);

  /** 합계(아이템) — 서버 subtotal이 있으면 사용, 없으면 unitPrice*qty로 계산 */
  const itemsTotal = useMemo(() => {
    const items = cart?.items ?? [];
    if (items.length === 0) return 0;
    return items.reduce((sum, r) => {
      if (typeof r?.subtotal === "number") return sum + r.subtotal;
      const unit = Number(r?.unitPrice ?? 0);
      const qty  = Number(r?.qty ?? 0);
      return sum + unit * qty;
    }, 0);
  }, [cart]);

  /** 요구된 로직: 셀러가 다르면 배송비 3,000원씩 합산, 같으면 1회만 */
  const computedShippingFee = useMemo(() => {
    if ((cart?.items?.length ?? 0) === 0) return 0;
    return SHIPPING_FEE_PER_SELLER * Math.max(1, distinctSellerCount);
  }, [cart, distinctSellerCount]);

  const computedPayableBase = useMemo(() => {
    return itemsTotal + computedShippingFee;
  }, [itemsTotal, computedShippingFee]);

  const canCheckout = useMemo(() => {
    return (cart?.items?.length ?? 0) > 0;
  }, [cart]);

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

  // 주문/결제 페이지로 이동 (배송지/포인트는 주문페이지에서 처리)
  const onCheckout = async () => {
    // 결제 직전 재검증(품절/부족 차단)
    const latest = await reload();
    const invalid = (latest?.items ?? []).filter(it => !it.inStock);
    if (invalid.length > 0) {
      alert("장바구니에 품절/재고 부족 항목이 있습니다. 수정/삭제 후 다시 시도해 주세요.");
      return;
    }
    navi(`/user/order?mode=cart`);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">장바구니</h1>
        {cart.items.length > 0 && (
          <button onClick={onClear} className="h-9 px-3 rounded-lg border hover:bg-gray-50 text-sm">모두 비우기</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* 리스트 */}
        <div className="rounded-2xl border bg-white">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">불러오는 중…</div>
          ) : cart.items.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">장바구니가 비어 있습니다.</div>
          ) : (
            <ul className="divide-y">
              {cart.items.map(row => (
                <li
                  key={row.cartItemId}
                  className={`p-4 flex items-center justify-between ${!row.inStock ? 'bg-red-50' : ''}`}
                >
                  <div>
                    <div className="font-medium">{row.productName}</div>
                    <div className="text-xs text-gray-500 break-words">{row.optionsJson}</div>
                    {!row.inStock && (
                      <div className="text-xs text-red-600 mt-1">품절 또는 재고 부족</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border rounded-md">
                      <button className="px-2 py-1" onClick={() => onQtyChange(row, row.qty - 1)}>-</button>
                      <span className="px-3 text-sm">{row.qty}</span>
                      <button className="px-2 py-1" onClick={() => onQtyChange(row, row.qty + 1)}>+</button>
                    </div>
                    <div className="w-28 text-right text-sm font-semibold">{(row.subtotal ?? (row.unitPrice ?? 0) * (row.qty ?? 0)).toLocaleString()}원</div>
                    <button className="h-8 px-3 rounded-lg border hover:bg-gray-50 text-sm" onClick={() => onRemove(row)}>삭제</button>
                  </div>
                </li>
              ))}
            </ul>
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

          <Button className="w-full" disabled={!canCheckout || loading} onClick={onCheckout}>
            결제하기
          </Button>
        </div>
      </div>
    </div>
  );
}
