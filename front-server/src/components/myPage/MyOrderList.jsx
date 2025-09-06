// MyOrderList.jsx
import React, { useEffect, useState } from 'react';
import { getMyOrders } from '../../service/orderService';
import MyOrderItem from './MyOrderItem';
import FeedbackChoiceModal from '../feedback/FeedbackChoiceModal';
import FeedbackEditModal from '../feedback/FeedbackEditModal';
import { getProductFeedbacks } from '/src/service/feedbackService';
import useAuthStore from '/src/stores/authStore';

const MyOrderList = () => {
  const me = useAuthStore(s => s.user);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 모달
  const [writeOpen, setWriteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // 자식 콜백 브릿지
  const [writeCallbacks, setWriteCallbacks] = useState(null);
  const [editCallbacks, setEditCallbacks] = useState(null);

  // 선택 상태
  const [selectedOrderItem, setSelectedOrderItem] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // ✅ 상품 단위 '내 피드백' 존재 캐시 (페이지 범위)
  //   undefined=모름, null=없음, object=있음
  const [presenceByProduct, setPresenceByProduct] = useState({});
  const setProductPresence = (productId, feedbackOrNull) =>
    setPresenceByProduct(prev => ({ ...prev, [productId]: feedbackOrNull ?? null }));

  const ensureProductPresence = async (productId) => {
    const known = presenceByProduct[productId];
    if (known !== undefined) return known;
    try {
      const res = await getProductFeedbacks(productId, { page: 0, size: 20 });
      const list = Array.isArray(res?.content) ? res.content
                : Array.isArray(res) ? res
                : (res?.data ?? []);
      const mine = list.find(f => (f?.user?.id ?? f?.userId) === me?.id) || null;
      setProductPresence(productId, mine);
      return mine;
    } catch {
      setProductPresence(productId, null);
      return null;
    }
  };

  // 주문 목록 로드
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getMyOrders();
        setOrders(data);
      } catch (err) {
        console.error(err);
        setError('주문 내역을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 작성 모달 열기: 상품단위로 이미 작성했는지 먼저 확인 → 있으면 수정 모달로 전환
  const openWrite = async (orderItem, callbacks) => {
    const pid = orderItem?.productId;
    let mine = pid ? presenceByProduct[pid] : null;
    if (mine === undefined && pid) {
      mine = await ensureProductPresence(pid); // 클릭 시 1회 확인
    }
    if (mine) {
      setSelectedFeedback(mine);
      setSelectedOrderItem(orderItem);
      setEditCallbacks(callbacks || null);
      setEditOpen(true);
      return;
    }
    setSelectedOrderItem(orderItem);
    setWriteCallbacks(callbacks || null);
    setWriteOpen(true);
  };

  // 수정 모달 열기
  const openEdit = (feedback, orderItem, callbacks) => {
    setSelectedFeedback(feedback);
    setSelectedOrderItem(orderItem);
    setEditCallbacks(callbacks || null);
    setEditOpen(true);
  };

  // 생성 성공: orders + presence 동시 갱신 → 버튼 즉시 '수정'으로 토글
  const handleFeedbackCreated = (feedback) => {
    const orderItemId = selectedOrderItem?.id;
    const productId   = selectedOrderItem?.productId;

    setOrders(prev => prev.map(o => {
      const items = o.items || o.orderItems || o.orderItemList || [];
      const nextItems = items.map(oi => (
        (oi.id === orderItemId || (productId && oi.productId === productId))
          ? {
              ...oi,
              feedback,
              feedbackId: feedback?.id,
              myFeedbackId: feedback?.id,
              feedbackAt: feedback?.createdAt || new Date().toISOString(),
            }
          : oi
      ));
      if (o.items) return { ...o, items: nextItems };
      if (o.orderItems) return { ...o, orderItems: nextItems };
      if (o.orderItemList) return { ...o, orderItemList: nextItems };
      return o;
    }));

    if (productId) setProductPresence(productId, feedback);
    writeCallbacks?.onCreated?.(feedback);
    setWriteCallbacks(null);
    setWriteOpen(false);
  };

  // 수정 성공: orders + presence 동시 갱신
  const handleFeedbackUpdated = (updated) => {
    const feedbackId = selectedFeedback?.id ?? updated?.id;
    const productId  = selectedOrderItem?.productId ?? updated?.productId;

    setOrders(prev => prev.map(o => {
      const items = o.items || o.orderItems || o.orderItemList || [];
      const nextItems = items.map(oi => {
        const fid = oi.myFeedbackId ?? oi.feedback?.id ?? oi.feedbackId;
        if (fid === feedbackId || (productId && oi.productId === productId)) {
          return {
            ...oi,
            feedbackId: feedbackId,
            myFeedbackId: feedbackId,
            feedback: { ...(oi.feedback || {}), ...(updated || {}) },
          };
        }
        return oi;
      });
      if (o.items) return { ...o, items: nextItems };
      if (o.orderItems) return { ...o, orderItems: nextItems };
      if (o.orderItemList) return { ...o, orderItemList: nextItems };
      return o;
    }));

    if (productId) setProductPresence(productId, updated);
    editCallbacks?.onUpdated?.(updated);
    setEditCallbacks(null);
    setEditOpen(false);
  };

  // 렌더
  if (loading) return <div className="text-center p-10">주문 내역을 불러오는 중...</div>;
  if (error)   return <div className="text-center p-10 text-red-500">{error}</div>;
  if (orders.length === 0) {
    return (
      <div className="border rounded-lg p-4 h-96 flex items-center justify-center text-gray-400">
        주문 내역이 없습니다.
      </div>
    );
  }

  return (
    <div>
      {orders.map(order => (
        <MyOrderItem
          key={order.id}
          order={order}
          onOpenWrite={openWrite}
          onOpenEdit={openEdit}
          presenceByProduct={presenceByProduct}  // ✅ 자식에 전달
        />
      ))}

      {/* 작성 모달 */}
      <FeedbackChoiceModal
        open={writeOpen}
        onClose={() => { setWriteOpen(false); setWriteCallbacks(null); }}
        onCreated={handleFeedbackCreated}        // ✅ 생성 콜백 연결
        orderItem={selectedOrderItem}
      />

      {/* 수정 모달 */}
      <FeedbackEditModal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditCallbacks(null); }}
        feedback={selectedFeedback}
        orderItem={selectedOrderItem}
        onUpdated={handleFeedbackUpdated}        // ✅ 수정 콜백 연결
      />
    </div>
  );
};

export default MyOrderList;
