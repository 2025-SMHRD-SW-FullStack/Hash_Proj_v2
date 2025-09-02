import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import TestImg from '../../../assets/images/ReSsol_TestImg.png';
import { checkFeedbackDone, getMyOrderDetail, confirmPurchase } from '../../../service/orderService';
import ConfirmPurchaseModal from '../../../components/modals/ConfirmPurchaseModal';

// 상태 한글 매핑
const statusLabel = (s) => ({
  PENDING: '결제 대기',
  PAID: '주문 완료',
  READY: '배송 준비중',
  IN_TRANSIT: '배송 중',
  DELIVERED: '배송 완료',
  CONFIRMED: '구매 확정',
}[s] || s);

const MyOrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [feedbackDoneStatus, setFeedbackDoneStatus] = useState({});

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const data = await getMyOrderDetail(orderId);
      setOrder(data);

      const doneStatus = {};
      if (data && data.items) {
        for (const item of data.items) {
          try {
            const isDone = await checkFeedbackDone(item.id);
            doneStatus[item.id] = isDone;
          } catch (feedbackError) {
            console.warn(`피드백 상태 확인 실패 (item ID: ${item.id}):`, feedbackError);
            doneStatus[item.id] = false;
          }
        }
      }
      setFeedbackDoneStatus(doneStatus);
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

  const handleWriteFeedback = (item) => {
    // ✅ 'DELIVERED' 상태에서도 바로 구매 확정 모달을 띄우도록 수정
    if (order.status === 'DELIVERED') {
      setOpenConfirm(true);
    } else if (order.status === 'CONFIRMED') {
      // 'CONFIRMED' 상태인 경우에만 피드백 작성 페이지로 바로 이동
      navigate(`/user/survey?orderItemId=${item.id}&productId=${item.productId}`);
    }
  };

  const handleConfirmAndFeedback = async () => {
    try {
      await confirmPurchase(orderId);
      const firstItem = order.items[0];
      if (firstItem) {
        navigate(`/user/survey?orderItemId=${firstItem.id}&productId=${firstItem.productId}`);
      }
    } catch (e) {
      alert("구매 확정 중 오류가 발생했습니다.");
    } finally {
      setOpenConfirm(false);
      // ✅ 구매 확정 후 페이지를 새로고침하여 상태를 업데이트합니다.
      fetchOrderDetail();
    }
  };

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!order) return <div>주문 정보를 찾을 수 없습니다.</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">주문 상세 내역</h2>
      <div className="border rounded-lg p-6 space-y-4 bg-white">
        {/* 주문 정보 등 */}
        <div>
          <h3 className="font-bold text-lg">주문 정보</h3>
          <p><strong>주문번호:</strong> {order.orderUid}</p>
          <p><strong>주문일자:</strong> {new Date(order.createdAt).toLocaleString('ko-KR')}</p>
          <p><strong>주문상태:</strong> {statusLabel(order.status)}</p>
        </div>
        <hr/>
        <div>
          <h3 className="font-bold text-lg mb-2">주문 상품</h3>
          {order.items.map(item => (
            <div key={item.id} className="flex items-center border-b py-4">
              <img src={TestImg} alt={item.productName} className="w-20 h-20 rounded-md object-cover mr-4" />
              <div className="flex-grow">
                <p className="font-semibold">{item.productName}</p>
                <p className="text-sm text-gray-600">{formatOptions(item.optionSnapshotJson)}</p>
                <p className="text-sm">{item.unitPrice.toLocaleString()}원 / {item.qty}개</p>
              </div>
              {(order.status === 'DELIVERED' || order.status === 'CONFIRMED') && !feedbackDoneStatus[item.id] && (
                <Button size="sm" onClick={() => handleWriteFeedback(item)}>
                  피드백 작성
                </Button>
              )}
              {order.status === 'CONFIRMED' && feedbackDoneStatus[item.id] && (
                <span className="inline-flex items-center text-sm rounded-full px-3 py-1 bg-green-100 text-green-800">
                  포인트 지급 완료
                </span>
              )}
            </div>
          ))}
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
        <div className="text-center pt-4">
          <Button variant="whiteBlack" onClick={() => navigate(-1)}>목록으로 돌아가기</Button>
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