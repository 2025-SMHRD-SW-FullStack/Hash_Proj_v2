import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadTossPayments } from '@tosspayments/payment-sdk';

import { getProductDetail } from '../service/productService';
import { getAddresses } from '../service/addressService';
import { checkout } from '../service/orderService';
import { confirmTossPayment } from '../service/paymentService';
import { getMyPointBalance } from '../service/pointService';

import AddressBookModal from '../components/address/AddressBookModal';
import RequestMemoField from '../components/order/RequestMemoField';
import Button from '../components/common/Button';
import api from '../config/axiosInstance';

const SHIPPING_FEE = 3000;

export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId');
  const itemsQuery = searchParams.get('items'); // e.g. "401_1,402_2"

  // 상품/주문 상태
  const [orderItems, setOrderItems] = useState([]);
  const [productInfo, setProductInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // 주소 상태
  const [addrLoading, setAddrLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addrModalOpen,   setAddrModalOpen]   = useState(false);

  // 요청사항
  const [requestMemo, setRequestMemo] = useState('');

  // 포인트
  const [pointBalance, setPointBalance] = useState(0);
  const [useAllPoint, setUseAllPoint] = useState(false);
  const [pointInput, setPointInput] = useState('0');

  // 진행 상태
  const [busy, setBusy] = useState(false);
  const [uiMsg, setUiMsg] = useState('');

  // ===== 상품/옵션 로드 =====
  useEffect(() => {
    const run = async () => {
      if (!productId || !itemsQuery) {
        setError('주문 정보가 올바르지 않습니다.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const pd = await getProductDetail(productId); // { product, variants }
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
  }, [productId, itemsQuery]);

  // ===== 주소/포인트 로드 =====
  useEffect(() => {
    (async () => {
      try {
        setAddrLoading(true);
        const list = await getAddresses();
        const primary = list?.find(a => a.primaryAddress) || list?.[0] || null;
        setSelectedAddress(primary);
      } finally {
        setAddrLoading(false);
      }
      try {
        const bal = await getMyPointBalance();
        setPointBalance(bal);
      } catch {
        // 포인트 없을 수도 있으니 조용히 스킵
      }
    })();
  }, []);

  // =========================
  // 🔒 훅은 여기까지 전부 호출되고 나서 렌더 분기
  // =========================

  // 금액 계산 (서버와 동일 규칙)
  const basePrice = useMemo(() => {
    const sp = productInfo?.salePrice ?? 0;
    const bp = productInfo?.basePrice ?? 0;
    return productInfo?.salePrice > 0 ? sp : bp;
  }, [productInfo]);

  const itemsSum = useMemo(() => {
    if (!Array.isArray(orderItems)) return 0;
    return orderItems.reduce((acc, it) => {
      const unit = (basePrice || 0) + (it?.variant?.addPrice || 0);
      const qty  = Number(it?.quantity || 0);
      return acc + unit * qty;
    }, 0);
  }, [orderItems, basePrice]);

  const payableBase   = itemsSum + SHIPPING_FEE;
  const desired       = useAllPoint ? payableBase : Math.max(0, Math.floor(Number(pointInput) || 0));
  const finalUsePoint = Math.max(0, Math.min(desired, Math.min(pointBalance, payableBase)));
  const finalPayAmount= Math.max(0, payableBase - finalUsePoint);

  // === 렌더 분기(이 아래에는 '훅' 없음) ===
  if (loading) return <div className="px-4 py-6">주문 정보를 불러오는 중…</div>;
  if (error)   return <div className="px-4 py-6 text-red-600">오류: {error}</div>;
  if (!productInfo || orderItems.length === 0) return <div className="px-4 py-6">주문 상품 정보가 없습니다.</div>;

  // 서버가 이해할 수 있도록 옵션 맵 구성
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

  // === “결제하기” 한 번에: 체크아웃 → 0원이면 confirm, 아니면 토스 결제창 ===
  const handlePay = async () => {
    if (!selectedAddress) {
      alert('배송지를 선택해 주세요.');
      return;
    }
    setBusy(true);
    setUiMsg('');
    let createdOrderId = null;

    try {
      const items = orderItems.map(i => ({
        productId: Number(productId),
        qty: Number(i.quantity),
        options: buildOptionsFromVariant(i.variant, productInfo),
      }));

      const payload = {
        addressId: selectedAddress.id,
        requestMemo: (requestMemo || '').slice(0, 200),
        useAllPoint,
        usePoint: useAllPoint ? 0 : finalUsePoint,
        items,
      };

      // 1) 체크아웃 요청
      const res = await checkout(payload); // { orderUid, payAmount, ... }
      const oid = String(res?.orderUid ?? res?.orderId ?? '').trim();
      if (!oid) throw new Error('주문번호 생성 실패');
      createdOrderId = oid;

      // 2) 결제 분기
      if ((res?.payAmount ?? 0) <= 0) {
        await confirmTossPayment({ paymentKey: 'ZERO', orderId: oid, amount: 0 });
        alert('결제금액 0원: 주문이 바로 처리되었습니다.');
        window.location.href = '/pay/success?orderId=' + encodeURIComponent(oid) + '&paymentKey=ZERO&amount=0';
        return;
      }

      // 3) 토스 결제창
      const clientKey = (import.meta.env.VITE_TOSS_CLIENT_KEY || '').trim();
      if (!clientKey) throw new Error('VITE_TOSS_CLIENT_KEY가 비어 있습니다.');

      const toss = await loadTossPayments(clientKey);
      await toss.requestPayment('카드', {
        orderId: oid,
        orderName: productInfo.name,
        amount: Number(res.payAmount),
        successUrl: `${window.location.origin}/pay/success`,
        failUrl: `${window.location.origin}/pay/fail`,
        customerName: selectedAddress?.receiver,
        customerMobilePhone: (selectedAddress?.phone || '').replace(/[^0-9]/g, ''),
      });
    } catch (e) {
      // 위젯 취소/에러 시 포인트 롤백(멱등)
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
      setUiMsg(
        e?.response?.data?.message ||
        e?.message ||
        '결제 처리 중 오류가 발생했습니다.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">주문/결제</h1>

      {/* 배송지 */}
      <section className="mb-8 border-b pb-6">
        <h2 className="text-lg font-semibold mb-3">배송지</h2>
        {addrLoading ? (
          <div className="text-sm text-gray-500">주소 불러오는 중…</div>
        ) : selectedAddress ? (
          <div className="rounded-2xl border p-4 mb-4 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">
                  {selectedAddress.receiver} ({selectedAddress.phone})
                </div>
                <div className="text-sm text-gray-600">
                  ({selectedAddress.zipcode}) {selectedAddress.addr1} {selectedAddress.addr2}
                </div>
                {selectedAddress.primaryAddress && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    기본 배송지
                  </span>
                )}
              </div>
              <button className="h-9 px-4 rounded-lg border hover:bg-gray-50" onClick={() => setAddrModalOpen(true)}>
                변경
              </button>
            </div>
          </div>
        ) : (
          <button className="h-10 px-4 rounded-lg bg-gray-900 text-white text-sm hover:opacity-90" onClick={() => setAddrModalOpen(true)}>
            배송지 추가
          </button>
        )}
      </section>

      {/* 배송 요청사항 */}
      <RequestMemoField value={requestMemo} onChange={setRequestMemo} />

      {/* ====== B: 주문 상품 정보 (위로 올림) ====== */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">주문 상품 정보</h2>

        {productInfo?.thumbnailUrl && (
          <img
            src={productInfo.thumbnailUrl}
            alt="상품 썸네일"
            className="w-32 h-32 object-cover rounded-lg mb-3"
          />
        )}
        <p><strong>상품명:</strong> {productInfo.name}</p>
        <hr className="my-4" />

        {orderItems.map((item) => {
          const unit = basePrice + (item.variant.addPrice || 0);
          return (
            <div key={item.variant.id} className="mb-3">
              <p>
                선택 옵션: {item.variant.option1Value}
                {item.variant.option2Value && ` / ${item.variant.option2Value}`}
              </p>
              <p>수량: {item.quantity}개</p>
              {/* 가격 라인 삭제 */}
              <hr className="my-3" />
            </div>
          );
        })}
      </section>

      {/* ====== A: 주문 요약 + 포인트 + CTA (아래로 내림) ====== */}
      <section className="my-6 rounded-2xl border p-4 bg-white">
        <h2 className="text-lg font-semibold mb-4">주문 요약</h2>
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span>상품 합계</span>
            <b>{itemsSum.toLocaleString()}원</b>
          </div>
          <div className="flex justify-between">
            <span>배송비</span>
            <b>{SHIPPING_FEE.toLocaleString()}원</b>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">포인트 사용</span>
              <span className="text-gray-600 text-sm">보유 {pointBalance.toLocaleString()} P</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useAllPoint}
                  onChange={(e) => setUseAllPoint(e.target.checked)}
                />
                모두 사용
              </label>
              <input
                type="number"
                min="0"
                step="100"
                disabled={useAllPoint}
                className="h-9 w-40 rounded-lg border px-3"
                value={useAllPoint ? '' : pointInput}
                onChange={(e) => setPointInput(e.target.value)}
                placeholder="사용 포인트"
              />
              <span className="text-sm text-gray-500">
                사용: <b>{finalUsePoint.toLocaleString()} P</b>
              </span>
            </div>
          </div>

          <div className="mt-4 flex justify-between text-base">
            <span className="font-semibold">결제 금액</span>
            <span className="font-semibold">{finalPayAmount.toLocaleString()}원</span>
          </div>
        </div>

        {uiMsg && (
          <div className="mt-4 rounded-lg bg-red-50 text-red-700 p-3 text-sm">
            {uiMsg}
          </div>
        )}

        <div className="mt-6">
          <Button disabled={busy || !selectedAddress} onClick={handlePay}>
            {busy ? '처리 중…' : '결제하기'}
          </Button>
        </div>
      </section>

      {/* 주소록 모달 */}
      <AddressBookModal
        open={addrModalOpen}
        defaultAddressId={selectedAddress?.id}
        onClose={() => setAddrModalOpen(false)}
        onSelected={(addr) => setSelectedAddress(addr)}
      />
    </div>
  );
}
