import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadTossPayments } from '@tosspayments/payment-sdk';

import { getProductDetail } from '../../../service/productService';
import { getAddresses } from '../../../service/addressService';
import { checkout } from '../../../service/orderService';
import { confirmTossPayment } from '../../../service/paymentService';
import { getMyPointBalance } from '../../../service/pointService';
import { getCart, checkoutCart } from '../../../service/cartService';

import AddressBookModal from '../../../components/address/AddressBookModal';
import RequestMemoField from '../../../components/order/RequestMemoField';
import Button from '../../../components/common/Button';
import api from '../../../config/axiosInstance';
import TestImg from '../../../assets/images/ReSsol_TestImg.png'

const SHIPPING_FEE = 3000;

const formatOptionsText = (optionsJson) => {
  if (!optionsJson) return '';
  try {
    const data = typeof optionsJson === 'string' ? JSON.parse(optionsJson) : optionsJson;
    if (!data) return '';

    if (Array.isArray(data)) {
      const parts = data.map(it => {
        if (!it) return '';
        if (typeof it === 'string') return it;
        const name = it.name ?? it.optionName ?? it.key ?? '';
        const value = it.value ?? it.optionValue ?? '';
        const text = [name, value].filter(Boolean).join(': ');
        return text;
      }).filter(Boolean);
      return parts.length ? `(${parts.join(' · ')})` : '';
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (!keys.length) return '';
      const parts = keys.map(k => (data[k] ? `${k}: ${data[k]}` : '')).filter(Boolean);
      return parts.length ? `(${parts.join(' · ')})` : '';
    }

    return '';
  } catch {
    return '';
  }
};


const OrderPage = () => {
  const [sp] = useSearchParams();
  const mode = (sp.get('mode') || sp.get('source') || '').toLowerCase();
  const isCartMode = mode === 'cart';
  const addressIdParam = sp.get('addressId');
  const productId = sp.get('productId');
  const itemsQuery = sp.get('items');

  // 선택 결제: ?items=1,2,3 → [1,2,3]
  const selectedCartItemIds = useMemo(() => {
    if (!isCartMode) return [];
    const raw = itemsQuery || '';
    if (!raw) return [];
    return raw.split(',').map(s => parseInt(s, 10)).filter(Boolean);
  }, [isCartMode, itemsQuery]);

  const isSelectedCart = isCartMode && selectedCartItemIds.length > 0;

  const [busy, setBusy] = useState(false);
  const [uiMsg, setUiMsg] = useState('');

  const [addrLoading, setAddrLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [requestMemo, setRequestMemo] = useState('');

  const [pointBalance, setPointBalance] = useState(0);
  const [useAllPoint, setUseAllPoint] = useState(false);
  const [pointInput, setPointInput] = useState('0');

  const [cartLoading, setCartLoading] = useState(isCartMode);
  const [cartData, setCartData] = useState({
    items: [],
    totalPrice: 0,
    shippingFee: 0,
    payableBase: 0,
  });

  const [loading, setLoading] = useState(!isCartMode);
  const [error, setError] = useState('');
  const [productInfo, setProductInfo] = useState(null);
  const [orderItems, setOrderItems] = useState([]);

  // 주소 및 포인트 불러오기
  useEffect(() => {
    (async () => {
      try {
        setAddrLoading(true);
        const list = await getAddresses();
        const targetId = addressIdParam ? Number(addressIdParam) : null;
        let sel = null;
        if (targetId && Array.isArray(list)) {
          sel = list.find(a => Number(a.id) === targetId) || null;
        }
        if (!sel) sel = list?.find(a => a.primaryAddress) || list?.[0] || null;
        setSelectedAddress(sel);
      } finally {
        setAddrLoading(false);
      }

      try {
        const bal = await getMyPointBalance();
        setPointBalance(bal);
      } catch { }
    })();
  }, [addressIdParam]);

  // cart 모드 데이터
  useEffect(() => {
    if (!isCartMode) return;
    (async () => {
      try {
        setCartLoading(true);
        const data = await getCart();
        let next = data || { items: [], totalPrice: 0, shippingFee: 0, payableBase: 0 };

        if (selectedCartItemIds.length) {
          // ✅ 선택된 항목만 남김
          const filtered = (next.items || []).filter(it => selectedCartItemIds.includes(it.cartItemId));
          const total = filtered.reduce((sum, r) => sum + (r.subtotal || 0), 0);

          // 선택 모드에선 합계 강제 재계산 (서버 payableBase 무시)
          next = {
            ...next,
            items: filtered,
            totalPrice: total,
            payableBase: undefined, // 서버 전체값 덮어쓰기 방지
          };
        }

        setCartData(next);
      } finally {
        setCartLoading(false);
      }
    })();
  }, [isCartMode, selectedCartItemIds]);


  // 단건 모드 데이터
  useEffect(() => {
    if (isCartMode) return;
    const run = async () => {
      if (!productId || !itemsQuery) {
        setError('주문 정보가 올바르지 않습니다.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const pd = await getProductDetail(productId);
        setProductInfo(pd.product);

        const parsed = itemsQuery
          .split(',')
          .map((s) => {
            const [variantId, qtyStr] = s.split('_');
            const variant = pd.variants.find(v => v.id === parseInt(variantId, 10));
            const quantity = parseInt(qtyStr, 10);
            if (!variant || !Number.isFinite(quantity) || quantity <= 0) return null;
            return { variant, quantity };
          })
          .filter(Boolean);

        if (parsed.length === 0) throw new Error('선택한 옵션을 찾을 수 없습니다.');
        setOrderItems(parsed);
      } catch (e) {
        setError(e?.message || '상품 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [isCartMode, productId, itemsQuery]);

  // 금액 계산
  const singleBasePrice = useMemo(() => {
    if (!productInfo) return 0;
    const { salePrice = 0, basePrice = 0 } = productInfo;
    return salePrice > 0 ? salePrice : basePrice;
  }, [productInfo]);

  const singleItemsSum = useMemo(() => {
    if (!Array.isArray(orderItems)) return 0;
    return orderItems.reduce((acc, it) => {
      const unit = (singleBasePrice || 0) + (it?.variant?.addPrice || 0);
      return acc + unit * Number(it?.quantity || 0);
    }, 0);
  }, [orderItems, singleBasePrice]);

  // 장바구니(선택 적용 후) 합계
  const cartItemsSum = useMemo(
    () => (cartData.items || []).reduce((s, r) => s + (r.subtotal || 0), 0),
    [cartData.items]
  );


  const deliveryFee = useMemo(() => {
    // 단건(바로구매) 모드이고, 상품 카테고리가 '무형자산'인 경우 배송비 0원
    if (!isCartMode && productInfo?.category === '무형자산') {
      return 0;
    }
    // 장바구니 모드이거나 그 외 모든 상품
    return isCartMode ? (cartData.shippingFee ?? SHIPPING_FEE) : SHIPPING_FEE;
  }, [isCartMode, productInfo, cartData.shippingFee]);


  const payableBase = isCartMode
    ? (isSelectedCart ? (cartItemsSum + deliveryFee) : ((cartData.payableBase ?? (cartItemsSum + deliveryFee))))
    : (singleItemsSum + deliveryFee);

  const desired = useAllPoint ? payableBase : Math.max(0, Math.floor(Number(pointInput) || 0));
  const finalUsePoint = Math.max(0, Math.min(desired, Math.min(pointBalance, payableBase)));
  const finalPayAmount = Math.max(0, payableBase - finalUsePoint);

  const buildOrderName = () => {
    const names = isCartMode
      ? (cartData?.items ?? []).map(x => x.productName).filter(Boolean)
      : (orderItems ?? []).map(() => productInfo?.name).filter(Boolean);
    if (names.length === 0) return '주문 결제';
    if (names.length === 1) return names[0];
    return `${names[0]} 외 ${names.length - 1}건`;
  };

  const requestToss = async ({ orderId, amount, orderName, customerName, customerMobilePhone }) => {
    const clientKey = (import.meta.env.VITE_TOSS_CLIENT_KEY || '').trim();
    if (!clientKey) throw new Error('VITE_TOSS_CLIENT_KEY가 비어 있습니다.');
    const toss = await loadTossPayments(clientKey);

    await toss.requestPayment('카드', {
      orderId,
      orderName: orderName || '주문 결제',
      amount: Number(amount),
      successUrl: `${window.location.origin}/user/pay/complete?status=success`,
      failUrl: `${window.location.origin}/user/pay/complete?status=fail`,
      customerName,
      customerMobilePhone: (customerMobilePhone || '').replace(/[^0-9]/g, ''),
    });
  };

  const buildOptionsFromVariant = (variant, product) => {
    const opts = {};
    for (let i = 1; i <= 5; i++) {
      const val = variant?.[`option${i}Value`];
      const label = product?.[`option${i}Name`];
      if (val && String(val).trim() !== '') {
        opts[`option${i}Value`] = val;
        opts[`option${i}`] = val;
        if (label && String(label).trim() !== '') {
          opts[label] = val;
        }
      }
    }
    return opts;
  };

  const handlePay = async () => {
    setUiMsg('');
    if (!selectedAddress) {
      alert('배송지를 선택해 주세요.');
      return;
    }

    // cart 모드
    if (isCartMode) {
      try {
        setBusy(true);

        const invalid = (cartData?.items ?? []).filter(it => !it.inStock);
        if (invalid.length > 0) {
          alert('장바구니에 품절/재고 부족 항목이 있습니다. 수정/삭제 후 다시 시도해 주세요.');
          return;
        }

        const res = await checkoutCart({
          addressId: selectedAddress.id,
          requestMemo: (requestMemo || '').slice(0, 200),
          useAllPoint,
          usePoint: useAllPoint ? 0 : finalUsePoint,
          clearCartAfter: true,
          ...(selectedCartItemIds.length ? { cartItemIds: selectedCartItemIds } : {}), // ✅ 추가
        });
        const oid = String(res?.orderId || res?.orderUid || '').trim();
        if (!oid) throw new Error('주문번호 생성 실패');

        if ((res?.payAmount ?? 0) <= 0) {
          const confirmRes = await confirmTossPayment({ paymentKey: 'ZERO', orderId: oid, amount: 0 });
          const dbId = confirmRes?.orderDbId ?? confirmRes?.orderId; // 숫자 ID
          const successUrl =
            `${window.location.origin}/user/pay/complete` +
            `?status=success&orderId=${encodeURIComponent(oid)}` +
            `&orderDbId=${encodeURIComponent(dbId ?? '')}&paymentKey=ZERO&amount=0`;
          window.location.href = successUrl;
          return;
        }

        await requestToss({
          orderId: oid,
          amount: res.payAmount,
          orderName: buildOrderName(),
          customerName: selectedAddress?.receiver,
          customerMobilePhone: selectedAddress?.phone,
        });
      } catch (e) {
        setUiMsg(e?.response?.data?.message || e?.message || '결제 처리 중 오류가 발생했습니다.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // 단건 모드
    let createdOrderId = null;
    try {
      setBusy(true);

      const items = orderItems.map(i => ({
        productId: Number(productId),
        qty: Number(i.quantity),
        options: buildOptionsFromVariant(i.variant, productInfo),
      }));

      const res = await checkout({
        addressId: selectedAddress.id,
        requestMemo: (requestMemo || '').slice(0, 200),
        useAllPoint,
        usePoint: useAllPoint ? 0 : finalUsePoint,
        items,
      });
      const oid = String(res?.orderId || res?.orderUid || '').trim();
      if (!oid) throw new Error('주문번호 생성 실패');
      createdOrderId = oid;

      if ((res?.payAmount ?? 0) <= 0) {
        const confirmRes = await confirmTossPayment({ paymentKey: 'ZERO', orderId: oid, amount: 0 });
        const dbId = confirmRes?.orderDbId ?? confirmRes?.orderId;
        const successUrl =
          `${window.location.origin}/user/pay/complete` +
          `?status=success&orderId=${encodeURIComponent(oid)}` +
          `&orderDbId=${encodeURIComponent(dbId ?? '')}&paymentKey=ZERO&amount=0`;
        window.location.href = successUrl;
        return;
      }

      await requestToss({
        orderId: oid,
        amount: res.payAmount,
        orderName: productInfo?.name || '주문 결제',
        customerName: selectedAddress?.receiver,
        customerMobilePhone: selectedAddress?.phone,
      });
    } catch (e) {
      if (createdOrderId) {
        try {
          await api.get('/api/payments/toss/fail', {
            params: {
              orderId: createdOrderId,
              code: 'USER_CANCEL_OR_ERROR',
              message: String(e?.message || 'Payment widget cancelled'),
            },
          });
        } catch (_) { }
      }
      setUiMsg(e?.response?.data?.message || e?.message || '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  if (!isCartMode && loading) return <div className="px-4 py-6">주문 정보를 불러오는 중…</div>;
  if (!isCartMode && error) return <div className="px-4 py-6 text-red-600">오류: {error}</div>;
  if (!isCartMode && (!productInfo || orderItems.length === 0)) return <div className="px-4 py-6">주문 상품 정보가 없습니다.</div>;

  return (
    <div className='bg-gray-50'>
      <div className="flex flex-col min-h-screen w-full max-w-4xl mx-auto ">
        <div className="px-4 sm:px-0 flex-1 flex flex-col justify-stretch ">
            <h1 className="pt-2 sm:pt-0 sm:my-8 text-2xl font-bold text-gray-900 ">주문/결제</h1>
          <section className='flex flex-col w-full max-w-5xl mx-auto gap-5  '>

            {/* 배송지 */}
            <div className="flex-1">
              <h2 className="my-0 text-xl font-semibold mb-4">배송지</h2>
              {addrLoading ? (
                <div className="text-sm text-gray-500">주소 불러오는 중…</div>
              ) : selectedAddress ? (
                <div className="rounded-2xl border p-5 bg-white shadow-md flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-800">{selectedAddress.receiver} ({selectedAddress.phone})</div>
                    <div className="text-sm text-gray-500 mt-1">
                      ({selectedAddress.zipcode}) {selectedAddress.addr1} {selectedAddress.addr2}
                    </div>
                    {selectedAddress.primaryAddress && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        기본 배송지
                      </span>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => setAddrModalOpen(true)} >
                    변경
                  </Button>
                </div>
              ) : (
                <Button variant="primary" onClick={() => setAddrModalOpen(true)}>
                  배송지 추가
                </Button>
              )}
            </div>

            {/* 요청사항 */}
            <RequestMemoField value={requestMemo} onChange={setRequestMemo} className='w-full' />

            {/* 주문 상품 정보 */}
            <section className="w-full mb-6">
              <h2 className="text-xl font-semibold mb-4">주문 상품 정보</h2>
              {isCartMode ? (
                cartLoading ? (
                  <div className="text-sm text-gray-500">장바구니 불러오는 중…</div>
                ) : cartData.items.length === 0 ? (
                  <div className="text-sm text-gray-600">장바구니가 비어 있습니다.</div>
                ) : (
                  <div className="space-y-4">
                    {cartData.items.map(row => (
                      <div key={row.cartItemId} className="rounded-xl border p-4 bg-white shadow-sm flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-800">{row.productName}</div>
                          <div className="text-xs text-gray-500 break-words">{row.optionsJson}</div>
                          {!row.inStock && (
                            <div className="text-xs text-red-600 mt-1">품절 또는 재고 부족</div>
                          )}
                        </div>
                        <div className="text-sm font-medium text-gray-700">수량: {row.qty}개</div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex-1 flex flex-col md:flex-row gap-6 bg-white">
                  <div className='flex-1 justify-center'>
                    {orderItems.map((item) => (
                      <div key={item.variant.id} className="flex items-center p-3 rounded-lg border shadow-md flex-row gap-2 ">
                        {productInfo?.thumbnailUrl && (
                          <img
                            src={productInfo.thumbnailUrl || TestImg}
                            alt="상품 썸네일"
                            className="w-20 h-20 sm:w-32 sm:h-32 object-cover rounded-lg flex-shrink-0"
                            onError={(e) => { e.target.onerror = null; e.target.src = TestImg; }}
                          />
                        )}
                        <div className='flex flex-col space-y-2'>
                          <span className="text-lg font-semibold text-gray-800">{productInfo?.name}</span>
                          <span className="text-sm text-gray-700">
                            선택 옵션: {item.variant.option1Value}
                            {item.variant.option2Value && ` / ${item.variant.option2Value}`}
                          </span>
                          <span className="text-sm text-gray-700">수량: {item.quantity}개</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              )}
              
            </section>

            {/* 포인트 UI 섹션 */}
            <section className="w-full bg-white rounded-2xl border p-5 shadow-md mb-10">
                <h2 className="text-xl font-semibold mb-4">포인트 사용</h2>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm">보유 {pointBalance.toLocaleString()} P</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      disabled={useAllPoint}
                      className="h-10 flex-grow rounded-lg border px-3"
                      value={useAllPoint ? finalUsePoint : pointInput}
                      onChange={(e) => setPointInput(e.target.value)}
                      placeholder="사용할 포인트 입력"
                    />
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={useAllPoint}
                        onChange={(e) => setUseAllPoint(e.target.checked)}
                      />
                      모두 사용
                    </label>
                </div>
                <div className="text-right mt-2 text-sm text-primary font-semibold">
                    사용될 포인트: {finalUsePoint.toLocaleString()} P
                </div>
            </section>

          </section>
        </div>

        {/* 주문 요약 / 결제 footer */}
        <div className="sticky bottom-0 bg-white border-t shadow-[0_-4px_10px_rgba(0,0,0,0.1)] p-4 md:p-6 z-10">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto sm:items-center ">
              <div className="flex justify-between min-w-[120px]">
                <span>상품 합계&ensp;</span>
                <b>{isCartMode ? (cartData.totalPrice ?? 0).toLocaleString() : (singleItemsSum ?? 0).toLocaleString()}원</b>
              </div>
              <div className="flex justify-between min-w-[100px]">
                <span>배송비&ensp;</span>
                <b>{deliveryFee.toLocaleString()}원</b>
              </div>
              <div className="flex justify-between min-w-[120px]">
                <span className='text-xl'>결제 금액&ensp;</span>
                <b className="text-primary text-xl font-semibold">{finalPayAmount.toLocaleString()}원</b>
              </div>
            </div>
            <Button
              disabled={busy || !selectedAddress || (isCartMode && cartLoading)}
              onClick={handlePay}
              className="w-full md:w-48 py-3 md:py-4 text-lg font-semibold"
            >
              {busy ? '처리 중…' : '결제하기'}
            </Button>
          </div>
          {uiMsg && <div className="mt-3 text-sm text-red-700">{uiMsg}</div>}
        </div>

        <AddressBookModal
          open={addrModalOpen}
          onClose={() => setAddrModalOpen(false)}
          defaultAddressId={selectedAddress?.id}
          onSelected={(addr) => setSelectedAddress(addr)}
        />
      </div>
    </div>
  );
};

export default OrderPage;
