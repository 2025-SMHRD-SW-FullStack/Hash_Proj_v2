import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyOrderDetail } from '../../service/orderService'; // 상세 정보 조회를 위한 함수 import
import { formatDateTime, formatPrice } from '../../util/format';
import { getOrderStatusText } from '../../util/orderUtils';
import Button from '../common/Button';
import StatusBadge from '../common/StatusBadge';
import { feedbackActionState, canEditFeedback } from '/src/util/feedbacksStatus';

// 각 주문 아이템을 표시하는 컴포넌트
// ※ onOpenWrite, onOpenEdit 는 부모(MyOrderList)에서 내려줌
const MyOrderItem = ({ order, onOpenWrite, onOpenEdit }) => {

  const navigate = useNavigate();
  // ✅ [수정] 주문 상세 정보를 담을 state와 로딩 상태를 추가합니다.
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ [추가] 아이템별 "내 피드백" 로컬 상태(작성/수정 성공 시 즉시 토글)
  const [fbMap, setFbMap] = useState({}); // { [itemId]: feedbackObj }

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

  // ✅ 상세 로드 시 초기 피드백 맵 구성(서버에 이미 있는 건 반영)
  useEffect(() => {
    if (!detail?.items) return;
    const next = {};
    detail.items.forEach((oi) => {
      const f = oi.feedback || (oi.feedbackId ? { id: oi.feedbackId } : null);
      if (f) next[oi.id] = f;
    });
    setFbMap(next);
  }, [detail?.items]);


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
      {/* ✅ 각 주문 아이템별 '피드백 작성/완료/수정' 액션 영역 */}
      <div className="mt-4 space-y-3">
        {(detail.items || []).map((oi) => {
          // deliveredAt/status가 아이템에 없으면 상세/주문 레벨에서 보강
          const merged = {
            ...oi,
            status: oi.status || detail.status || order.status,
            deliveredAt: oi.deliveredAt || detail.deliveredAt || order.deliveredAt,
          };
          // ✅ 로컬 상태(fbMap)가 우선 → 작성/수정 직후 즉시 반영
          const existingFeedback =
            presenceByProduct?.[oi.productId] || fbMap[oi.id] || oi.feedback || (oi.feedbackId ? { id: oi.feedbackId } : null);

          const { label, sub, state } = feedbackActionState(merged, existingFeedback);
          const disabled = state !== 'enabled';
          const showEdit = !!existingFeedback && canEditFeedback(merged, existingFeedback);

          return (
            <div key={oi.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t pt-3">
              {/* 좌측: 아이템 요약 (이름/수량 등 — 기존 스타일 유지) */}
              <div>
                <div className="font-medium">{oi.productName}</div>
                {typeof oi.qty === 'number' && (
                  <div className="text-sm text-gray-600">수량: {oi.qty}개</div>
                )}
              </div>

              {/* 우측: 버튼/안내 (요구사항: 이미 작성이면 '피드백 수정'으로 변경) */}
              <div className="flex items-center gap-2">
                {existingFeedback ? (
                  <Button
                    size="sm"
                    disabled={!canEditFeedback(merged, existingFeedback)}  // 7일 지나면 비활성
                    onClick={() => canEdit && onOpenEdit?.(existingFeedback, merged, {
                      onUpdated: (updated) => setFbMap(prev => ({ ...prev, [merged.id]: updated })),
                    })}
                  >
                    {canEditFeedback(merged, existingFeedback) ? '피드백 수정' : '피드백 작성 완료'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={state !== 'enabled'}
                    onClick={() => onOpenWrite?.(merged, {
                      onCreated: (created) => setFbMap(prev => ({ ...prev, [merged.id]: created })),
                    })}
                  >
                    피드백 작성
                  </Button>
                )}
                {!!sub && <span className="text-xs text-gray-500">{sub}</span>}
              </div>
            </div>
          );
        })}
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