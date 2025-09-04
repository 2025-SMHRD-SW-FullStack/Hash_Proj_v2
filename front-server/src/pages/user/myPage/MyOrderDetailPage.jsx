import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import TestImg from '../../../assets/images/ReSsol_TestImg.png';
import { checkFeedbackDone, getMyOrderDetail, confirmPurchase } from '../../../service/orderService';
import ConfirmPurchaseModal from '../../../components/modals/ConfirmPurchaseModal';

const statusLabel = (s) => ({
  PENDING: '결제 대기',
  PAID: '주문 완료',
  READY: '배송 준비중',
  IN_TRANSIT: '배송 중',
  DELIVERED: '배송 완료',
  CONFIRMED: '구매 확정',
}[s] || s);

// 옵션 한 줄을 보여주는 컴포넌트
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

// 상품 단위로 묶어서 보여주는 컴포넌트
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
          {/* 각 옵션들을 렌더링 */}
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

  // [추가] 상품별로 아이템을 그룹핑하는 로직
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
  
  // 피드백 작성 여부를 단일 boolean 값으로 관리
  const [feedbackDone, setFeedbackDone] = useState(false);
  const firstItem = useMemo(() => order?.items?.[0], [order]);


  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const data = await getMyOrderDetail(orderId);
      setOrder(data);

      // 주문의 첫번째 상품 기준으로 피드백 작성 여부 확인
      if (data && data.items && data.items.length > 0) {
        const firstProduct = data.items[0];
        // 백엔드에 productId로 피드백 존재 유무를 확인하는 API가 필요합니다.
        // 여기서는 기존 함수를 재활용하되, productId를 넘겨준다고 가정합니다.
        const isDone = await checkFeedbackDone(firstProduct.productId);
        setFeedbackDone(isDone);
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

  const formatOptions = (jsonString) => {
    try {
      const options = JSON.parse(jsonString);
      return Object.entries(options).map(([key, value]) => `${key}: ${value}`).join(', ');
    } catch (e) { return '옵션 정보 없음'; }
  };
  
  // 피드백 작성 버튼 핸들러 수정
  const handleWriteFeedback = () => {
    if (order.status === 'DELIVERED') {
      setOpenConfirm(true);
    } else if (order.status === 'CONFIRMED' && firstItem) {
      navigate(`/user/survey?orderItemId=${firstItem.id}&productId=${firstItem.productId}`);
    }
  };

  const handleConfirmAndFeedback = async () => {
    try {
      await confirmPurchase(orderId);
      if (firstItem) {
        navigate(`/user/survey?orderItemId=${firstItem.id}&productId=${firstItem.productId}`);
      }
    } catch (e) {
      alert("구매 확정 중 오류가 발생했습니다.");
    } finally {
      setOpenConfirm(false);
      fetchOrderDetail();
    }
  };

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!order) return <div>주문 정보를 찾을 수 없습니다.</div>;

  // 피드백 작성 버튼을 보여줄지 여부 결정
  const canWriteFeedback = (order.status === 'DELIVERED' || order.status === 'CONFIRMED') && !feedbackDone;

  

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

        {/* --- [수정] 버튼 영역 로직 변경 --- */}
        <div className="text-center pt-4 border-t">
          {canWriteFeedback && 
            <Button size="lg" onClick={handleWriteFeedback} className="mr-2">피드백 작성</Button>
          }
          <Button variant="blackWhite" size="lg" onClick={() => navigate(-1)}>목록으로 돌아가기</Button>
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