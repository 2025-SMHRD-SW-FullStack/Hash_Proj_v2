import React, { useEffect, useState } from 'react';
import { getMyOrders } from '../../service/orderService';
import MyOrderItem from './MyOrderItem'
import FeedbackChoiceModal from '../feedback/FeedbackChoiceModal';
import FeedbackEditModal from '../feedback/FeedbackEditModal';



// 주문 목록 전체를 관리하는 메인 컴포넌트
const MyOrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 피드백 작성/수정 모달 제어
  const [writeOpen, setWriteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState(null); // 버튼이 속한 주문아이템
  const [selectedFeedback, setSelectedFeedback] = useState(null);   // 수정 대상 피드백



  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await getMyOrders();
        setOrders(data);
      } catch (err) {
        setError('주문 내역을 불러오는데 실패했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // MyOrderItem에서 호출: 작성 모달 열기
  const openWrite = (orderItem) => {
    setSelectedOrderItem(orderItem);
    setWriteOpen(true);
  };
  // MyOrderItem에서 호출: 수정 모달 열기
  const openEdit = (feedback, orderItem) => {
    setSelectedFeedback(feedback);
    setSelectedOrderItem(orderItem);
    setEditOpen(true);
  };

  // 생성 후 orders 상태 갱신(중첩 배열 안전 갱신)
  const handleFeedbackCreated = (orderItemId, feedback) => {
    setOrders(prev => prev.map(o => {
      const items = o.items || o.orderItems || o.orderItemList || [];
      const nextItems = items.map(oi => (
        (oi.id === orderItemId)
          ? { ...oi, feedback, feedbackId: feedback?.id, feedbackAt: feedback?.createdAt || new Date().toISOString() }
          : oi
      ));
      // 원래 키 유지
      if (o.items) return { ...o, items: nextItems };
      if (o.orderItems) return { ...o, orderItems: nextItems };
      if (o.orderItemList) return { ...o, orderItemList: nextItems };
      return o;
    }));
    setWriteOpen(false);
  };

  // 수정 후 orders 상태 갱신
  const handleFeedbackUpdated = (feedbackId, updated) => {
    setOrders(prev => prev.map(o => {
      const items = o.items || o.orderItems || o.orderItemList || [];
      const nextItems = items.map(oi => {
        const fid = oi.feedback?.id ?? oi.feedbackId;
        if (fid === feedbackId) {
          return {
            ...oi,
            feedbackId: feedbackId,
            feedback: { ...(oi.feedback || {}), ...(updated || {}) }
          };
        }
        return oi;
      });
      if (o.items) return { ...o, items: nextItems };
      if (o.orderItems) return { ...o, orderItems: nextItems };
      if (o.orderItemList) return { ...o, orderItemList: nextItems };
      return o;
    }));
    setEditOpen(false);
  };

  if (loading) return <div className="text-center p-10">주문 내역을 불러오는 중...</div>;
  if (error) return <div className="text-center p-10 text-red-500">{error}</div>;
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
        />
      ))}

      {/* 작성 모달 */}
      <FeedbackChoiceModal
        open={writeOpen}
        onClose={() => setWriteOpen(false)}
        onCreated={handleFeedbackCreated}
        // 작성 시 내부에서 selectedOrderItem.id 사용하므로 내려줄 필요 없지만,
        // 해당 모달 구현에 따라 필요하면 prop 추가
        orderItem={selectedOrderItem}
      />
      {/* 수정 모달 */}
      <FeedbackEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        feedback={selectedFeedback}
        orderItem={selectedOrderItem}
        onUpdated={handleFeedbackUpdated}
      />
    </div>
  );
};

export default MyOrderList;