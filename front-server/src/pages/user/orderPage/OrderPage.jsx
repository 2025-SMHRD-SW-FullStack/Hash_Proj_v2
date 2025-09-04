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

const OrderPage = () => {
  const [sp] = useSearchParams();
  const mode = (sp.get('mode') || sp.get('source') || '').toLowerCase();
  const isCartMode = mode === 'cart';
  const addressIdParam = sp.get('addressId');
  const productId = sp.get('productId');
  const itemsQuery = sp.get('items');

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
      } catch {}
    })();
  }, [addressIdParam]);

  useEffect(() => {
    if (!isCartMode) return;
    (async () => {
      try {
        setCartLoading(true);
        const data = await getCart();
        setCartData(data || { items: [], totalPrice: 0, shippingFee: 0, payableBase: 0 });
      } finally {
        setCartLoading(false);
      }
    })();
  }, [isCartMode]);

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

  const deliveryFee = useMemo(() => {
    if (!isCartMode && productInfo?.category === '무형자산') return 0;
    return isCartMode ? (cartData.shippingFee ?? SHIPPING_FEE) : SHIPPING_FEE;
  }, [isCartMode, productInfo, cartData.shippingFee]);

  const payableBase = isCartMode
    ? (cartData?.payableBase || (cartData.totalPrice + deliveryFee))
    : (singleItemsSum + deliveryFee);

  const desired       = useAllPoint ? payableBase : Math.max(0, Math.floor(Number(pointInput) || 0));
  const finalUsePoint = Math.max(0, Math.min(desired, Math.min(pointBalance, payableBase)));
  const finalPayAmount= Math.max(0, payableBase - finalUsePoint);

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
        });
        const oid = String(res?.orderId || res?.orderUid || '').trim();
        if (!oid) throw new Error('주문번호 생성 실패');
        if ((res?.payAmount ?? 0) <= 0) {
          await confirmTossPayment({ paymentKey: 'ZERO', orderId: oid, amount: 0 });
          window.location.href = `/pay/success?orderId=${encodeURIComponent(oid)}&paymentKey=ZERO&amount=0`;
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
        await confirmTossPayment({ paymentKey: 'ZERO', orderId: oid, amount: 0 });
        window.location.href = `/pay/success?orderId=${encodeURIComponent(oid)}&paymentKey=ZERO&amount=0`;
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
        } catch (_) {}
      }
      setUiMsg(e?.response?.data?.message || e?.message || '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  if (!isCartMode && loading) return <div className="px-4 py-6 text-center text-gray-500">주문 정보를 불러오는 중…</div>;
  if (!isCartMode && error) return <div className="px-4 py-6 text-center text-red-600">오류: {error}</div>;
  if (!isCartMode && (!productInfo || orderItems.length === 0)) return <div className="px-4 py-6 text-center text-gray-500">주문 상품 정보가 없습니다.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-36 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">주문/결제</h1>

      {/* 배송지 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">배송지</h2>
        {addrLoading ? (
          <div className="text-sm text-gray-500">주소 불러오는 중…</div>
        ) : selectedAddress ? (
          <div className="rounded-2xl border p-5 bg-white shadow-md flex justify-between items-start">
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
            <Button variant='signUp' onClick={() => setAddrModalOpen(true)}>변경</Button>
          </div>
        ) : (
          <button
            className="h-10 px-5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:opacity-90"
            onClick={() => setAddrModalOpen(true)}
          >
            배송지 추가
          </button>
        )}
      </section>

      {/* 요청사항 */}
      <RequestMemoField value={requestMemo} onChange={setRequestMemo} />

      {/* 주문 상품 정보 */}
      <section className="mb-8">
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
          <div className="flex flex-col md:flex-row items-start gap-6">
            {productInfo?.thumbnailUrl && (
              <img
                src={productInfo.thumbnailUrl || TestImg}
                alt="상품 썸네일"
                className="w-36 h-36 object-cover rounded-lg shadow-sm flex-shrink-0"
                onError={(e) => { e.target.onerror = null; e.target.src = TestImg; }}
              />
            )}
            <div className="flex-1 space-y-2">
              <p className="text-lg font-semibold text-gray-800">{productInfo?.name}</p>
              {orderItems.map((item) => (
                <div key={item.variant.id} className="p-3 rounded-lg border bg-gray-50 shadow-sm">
                  <p className="text-sm text-gray-700">
                    선택 옵션: {item.variant.option1Value}
                    {item.variant.option2Value && ` / ${item.variant.option2Value}`}
                  </p>
                  <p className="text-sm text-gray-700">수량: {item.quantity}개</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 고정형 주문 요약 / 결제 Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-[0_-4px_10px_rgba(0,0,0,0.1)] p-4 md:p-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* 주문 요약 */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm md:text-base">
            <div className="flex justify-between min-w-[120px]">
              <span>상품 합계</span>
              <b className="text-gray-800">{isCartMode ? (cartData.totalPrice ?? 0).toLocaleString() : (singleItemsSum ?? 0).toLocaleString()}원</b>
            </div>
            <div className="flex justify-between min-w-[100px]">
              <span>배송비</span>
              <b className="text-gray-800">{deliveryFee.toLocaleString()}원</b>
            </div>
            <div className="flex justify-between min-w-[120px]">
              <span>결제 금액</span>
              <b className="text-gray-900 font-semibold">{finalPayAmount.toLocaleString()}원</b>
            </div>
          </div>

          {/* 결제 버튼 */}
          <Button
            disabled={busy || !selectedAddress || (isCartMode && cartLoading)}
            onClick={handlePay}
            className="w-full md:w-48 py-3 md:py-4 text-lg font-semibold"
          >
            {busy ? '처리 중…' : '결제하기'}
          </Button>
        </div>

        {uiMsg && (
          <div className="mt-3 text-sm text-red-700">
            {uiMsg}
          </div>
        )}
      </div>


      <AddressBookModal
        open={addrModalOpen}
        onClose={() => setAddrModalOpen(false)}
        defaultAddressId={selectedAddress?.id}
        onSelected={(addr) => setSelectedAddress(addr)}
      />
    </div>
  );
};

export default OrderPage;
