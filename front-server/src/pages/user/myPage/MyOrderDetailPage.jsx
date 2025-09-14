import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import TestImg from '../../../assets/images/ReSsol_TestImg.png';
import { checkFeedbackDone, getMyOrderDetail, confirmPurchase, getConfirmWindow } from '../../../service/orderService';
import ConfirmPurchaseModal from '../../../components/modals/ConfirmPurchaseModal';
import { hasMyFeedbackForProduct, getMyFeedbackIdByProduct } from '../../../service/feedbackService';

const statusLabel = (s) => ({
  PENDING: '결제 대기',
  PAID: '주문 완료',
  READY: '배송 준비중',
  IN_TRANSIT: '배송 중',
  DELIVERED: '배송 완료',
  CONFIRMED: '구매 확정',
}[s] || s);

function VariationRow({ variation }) {
  const totalPrice = variation.quantity * variation.unitPrice;
  return (
    <div className="border-t border-gray-100 flex justify-between items-center">
      <div className="text-sm text-gray-700 my-1">
        <span>{variation.options}</span>
      </div>
      <div className="text-sm text-gray-800 shrink-0 ml-4">
        <span>{variation.quantity}개 · </span>
        <span className="font-semibold">{totalPrice.toLocaleString()}원</span>
      </div>
    </div>
  );
}

function GroupedProductRow({ product }) {
  return (
    <div className="border-b last:border-b-0 py-4">
      <div className="flex items-start gap-4">
        <div className="w-24 h-24 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
          <img 
            src={product.thumbnailUrl || TestImg} 
            alt={product.productName} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = TestImg;
            }} 
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base mb-2">{product.productName}</div>
          <div className="border-t border-b border-gray-200">
             {product.variations.map(v => <VariationRow key={v.id} variation={v} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

const MyOrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);

  const [confirmWindow, setConfirmWindow] = useState({ open: true });

   // [FEEDBACK-FIX] 주문 내 상품 집계 상태
   const [allDone, setAllDone] = useState(false);      // 전부 작성됨?
   const [hasWritable, setHasWritable] = useState(false); // 미작성 상품 존재?
   const [editTarget, setEditTarget] = useState(null); // { orderItemId, productId }
 
   const navToEditForProduct = async (productId, orderItemId) => {
     try {
       const fid = await getMyFeedbackIdByProduct(productId);
       if (fid) {
         navigate(`/user/feedback/editor?feedbackId=${fid}&productId=${productId}${orderItemId ? `&orderItemId=${orderItemId}` : ''}&type=MANUAL`);
         return;
       }
     } catch (e) { console.error(e); }
     navigate(`/user/feedback/editor?feedbackId=auto&productId=${productId}${orderItemId ? `&orderItemId=${orderItemId}` : ''}&type=MANUAL`);
   }; 

  const groupedItems = useMemo(() => {
    if (!order?.items) return [];
    const groups = order.items.reduce((acc, item) => {
      const groupId = item.productId || item.productName;
      if (!acc[groupId]) {
        acc[groupId] = {
          groupId,
          productName: item.productName || "상품",
          thumbnailUrl: item.thumbnailUrl || "",
          variations: [],
        };
      }
      const optionValues = [];
      try {
        const opts = JSON.parse(item.optionSnapshotJson || '{}');
        Object.values(opts).forEach(v => { if(v) optionValues.push(String(v)); });
      } catch(e) {}
      const optsString = optionValues.filter(Boolean).join(" / ") || "기본";

      acc[groupId].variations.push({
        id: item.id,
        options: optsString,
        quantity: Number(item.qty ?? 1),
        unitPrice: Number(item.unitPrice ?? 0),
      });
      return acc;
    }, {});
    return Object.values(groups);
  }, [order?.items]);
  
  const [feedbackDone, setFeedbackDone] = useState(false);
  const firstItem = useMemo(() => order?.items?.[0], [order]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const data = await getMyOrderDetail(orderId);
      setOrder(data);
      if (data?.items?.length) {
        const pids = Array.from(new Set(data.items.map(it => it.productId).filter(Boolean)));
        const entries = await Promise.all(pids.map(async (pid) => {
          try { return [pid, !!(await hasMyFeedbackForProduct(pid))]; }
          catch { return [pid, false]; }
        }));
        const map = Object.fromEntries(entries);
        const anyNotDone = pids.some(pid => !map[pid]);
        setHasWritable(anyNotDone);
        setAllDone(pids.length > 0 && pids.every(pid => map[pid]));
        if (!anyNotDone) {
          const pid = pids.find(p => map[p]);
          const item = data.items.find(it => it.productId === pid);
          if (item) setEditTarget({ orderItemId: item.id, productId: pid });
        } else {
          setEditTarget(null);
        }
      } else {
        setAllDone(false); setHasWritable(false); setEditTarget(null);
      }
      if (data && data.items && data.items.length > 0) {
        const first = data.items[0];
        // ✅ 반드시 orderItemId로 체크
        const isDone = await checkFeedbackDone(first.id);
        setFeedbackDone(isDone);
      }

      try {
        const w = await getConfirmWindow(orderId);
        setConfirmWindow({ open: Boolean(w?.open) });
      } catch {
        setConfirmWindow({ open: false });
      }
    } catch (err) {
      setError('주문 상세 정보를 불러오는 데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const handleWriteFeedback = () => {
    if (order.status === 'DELIVERED') {
      setOpenConfirm(true);
    } else if (order.status === 'CONFIRMED') {
      navigate(`/user/survey?orderId=${order.id}`); // ✅ 다건 대응
    }
  };

  const handleConfirmAndFeedback = async () => {
    try {
      // (선택) 윈도우가 닫혔는지 재확인 – 서버 정책 보강
      try {
        const w = await getConfirmWindow(orderId);
        if (w && w.open === false) {
          alert('지금은 구매확정을 할 수 없습니다. (배송완료 후 7일 이내만 가능)');
          return;
        }
      } catch (_) {
        // 윈도우 조회 실패는 구매확정 시도 쪽에서 처리
      }
      await confirmPurchase(orderId);
      setOpenConfirm(false);

      // ✅ 구매확정 직후 분기
      if (!hasWritable && editTarget) {
        // 이 주문의 모든 상품이 이미 작성됨 → '수정'으로 이동 (productId 기준으로 feedbackId 확정)
        await navToEditForProduct(editTarget.productId, editTarget.orderItemId);
      } else {
        // 미작성 상품이 하나라도 있으면 설문으로 이동 (같이 산 상품 중 미작성만 작성)
        navigate(`/user/survey?orderId=${orderId}`);
      }
    } catch (e) {
      alert("구매 확정 중 오류가 발생했습니다.");
    } finally {
      fetchOrderDetail();
    }
  };

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!order) return <div>주문 정보를 찾을 수 없습니다.</div>;

  const withinWindow = Boolean(confirmWindow?.open);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">주문 상세 내역</h2>
      <div className="border rounded-lg p-6 space-y-4 bg-white">
        <div>
          <h3 className="font-bold text-lg">주문 정보</h3>
          <p><strong>주문번호:</strong> {order.orderUid}</p>
          <p><strong>주문일자:</strong> {new Date(order.createdAt).toLocaleString('ko-KR')}</p>
          <p><strong>주문상태:</strong> {statusLabel(order.status)}</p>
        </div>
        <hr/>
        <div>
          <h3 className="font-bold text-lg mb-2">주문 상품</h3>
          <div>
            {loading ? (
              <p>상품 정보를 불러오는 중...</p>
            ) : (
              groupedItems.map((p) => <GroupedProductRow key={p.groupId} product={p} />)
            )}
          </div>
        </div>
        <hr/>
        <div>
          <h3 className="font-bold text-lg">배송지 정보</h3>
          <p><strong>받는분:</strong> {order.receiver}</p>
          <p><strong>연락처:</strong> {order.phone}</p>
          <p><strong>주소:</strong> ({order.zipcode}) {order.addr1} {order.addr2}</p>
          <p><strong>배송메모:</strong> {order.requestMemo || '없음'}</p>
        </div>
        <hr/>
        <div>
          <h3 className="font-bold text-lg">결제 정보</h3>
          <p><strong>총 상품금액:</strong> {order.totalPrice.toLocaleString()}원</p>
          <p><strong>배송비:</strong> 3,000원</p>
          <p><strong>사용 포인트:</strong> {order.usedPoint.toLocaleString()}P</p>
          <p className="font-bold"><strong>총 결제금액:</strong> {order.payAmount.toLocaleString()}원</p>
        </div>

        {/* 액션 영역 */}
        <div className="text-center pt-4 border-t flex flex-wrap gap-2 justify-center">
          {order.status === 'CONFIRMED' && withinWindow && (
            hasWritable ? (
              <Button size="lg" onClick={handleWriteFeedback} className="mr-2">피드백 작성</Button>
            ):(
              editTarget && (
                <Button size="lg" variant="unselected" onClick={() => navToEditForProduct(editTarget.productId, editTarget.orderItemId)}>
                  피드백 수정
                </Button>
              )
            )
          )}
          {["DELIVERED","CONFIRMED"].includes(order.status) && feedbackDone && !withinWindow && (
            <span className="inline-flex items-center rounded-full px-3 py-1 bg-emerald-100 text-emerald-700 mr-2">
              피드백 작성 완료
            </span>
          )}
          {["DELIVERED","CONFIRMED"].includes(order.status) && !feedbackDone && !withinWindow && (
            <span className="inline-flex items-center rounded-full px-3 py-1 bg-rose-100 text-rose-700 mr-2">
              기간 만료
            </span>
          )}
          <Button variant="blackWhite" size="lg" onClick={() => navigate('/user/mypage/orders')}>목록으로 돌아가기</Button>
        </div>
      </div>

      <ConfirmPurchaseModal
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleConfirmAndFeedback}
      />
    </div>
  );
};

export default MyOrderDetailPage;
