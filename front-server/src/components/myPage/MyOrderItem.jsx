import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyOrderDetail } from '../../service/orderService'; // 상세 정보 조회를 위한 함수 import
import { formatDateTime, formatPrice } from '../../util/format';
import { getOrderStatusText } from '../../util/orderUtils';
import Button from '../common/Button';
import StatusBadge from '../common/StatusBadge';

// 각 주문 아이템을 표시하는 컴포넌트
const MyOrderItem = ({ order }) => {
  const navigate = useNavigate();
  // ✅ [수정] 주문 상세 정보를 담을 state와 로딩 상태를 추가합니다.
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ [수정] order.id가 변경될 때마다 해당 주문의 상세 정보를 불러옵니다.
  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!order.id) return;
      try {
        setLoading(true);
        const data = await getMyOrderDetail(order.id);
        setDetail(data);
      } catch (error) {
        console.error(`주문 상세 정보(${order.id})를 불러오는 데 실패했습니다.`, error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetail();
  }, [order.id]);

  // ✅ [수정] detail state가 로드되기 전에는 로딩 상태를 표시합니다.
  if (loading) {
    return (
      <div className="border rounded-lg p-4 mb-4">
        <p className="text-center text-gray-500">주문 상품 정보 불러오는중...</p>
      </div>
    );
  }

  // ✅ [수정] detail 정보가 없을 경우 에러 메시지를 표시합니다.
  if (!detail || !detail.items || detail.items.length === 0) {
    return (
      <div className="border rounded-lg p-4 mb-4">
        <p className="text-center text-red-500">주문 상품 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  // ✅ [수정] detail.items에서 상품 정보를 가져와 표시합니다.
  const firstItem = detail.items[0];
  const displayProductName =
    detail.items.length > 1
      ? `${firstItem.productName} 외 ${detail.items.length - 1}건`
      : firstItem.productName;

  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-500">주문번호: {order.orderUid}</span>
        <StatusBadge status={order.status} />
      </div>
      <div className="flex items-center">
        <div className="w-24 h-24 bg-gray-100 rounded-md mr-4 flex-shrink-0">
          {/* 실제 썸네일 이미지가 있다면 여기에 표시 */}
        </div>
        <div className="flex-grow">
          <p className="font-semibold">{displayProductName}</p>
          <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
          <p className="text-lg font-bold mt-1">{formatPrice(order.payAmount)}원</p>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <Button
          variant="unselected"
          onClick={() => navigate(`/user/mypage/orders/${order.id}`)}
        >
          주문 상세 보기
        </Button>
      </div>
    </div>
  );
};

export default MyOrderItem;