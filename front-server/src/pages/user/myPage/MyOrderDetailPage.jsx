import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMyOrderDetail } from '../../../service/myOrderListService';
import Button from '../../../components/common/Button';
import TestImg from '../../../assets/images/ReSsol_TestImg.png';

const MyOrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      try {
        setLoading(true);
        const data = await getMyOrderDetail(orderId);
        setOrder(data);
      } catch (err) {
        setError('주문 상세 정보를 불러오는 데 실패했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetail();
  }, [orderId]);

  const formatOptions = (jsonString) => {
    try {
      const options = JSON.parse(jsonString);
      return Object.entries(options)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    } catch (e) {
      return '옵션 정보 없음';
    }
  };
  
  // 👇 [추가] 피드백 작성 페이지로 이동하는 함수
  const handleWriteFeedback = (orderItemId) => {
    navigate(`/user/feedback/${orderItemId}`);
  };


  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!order) return <div>주문 정보를 찾을 수 없습니다.</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">주문 상세 내역</h2>
      
      <div className="border rounded-lg p-6 space-y-4">
        {/* ... 주문 정보, 배송지 정보, 결제 정보 (기존과 동일) ... */}
        <div>
          <h3 className="font-bold text-lg">주문 정보</h3>
          <p><strong>주문번호:</strong> {order.orderUid}</p>
          <p><strong>주문일자:</strong> {new Date(order.createdAt).toLocaleString('ko-KR')}</p>
          <p><strong>주문상태:</strong> {order.status}</p>
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
                    {/* 👇 [추가] 배송 완료 상태일 때만 피드백 버튼을 보여줍니다. */}
                    {order.status === 'DELIVERED' && (
                      <Button size="sm" onClick={() => handleWriteFeedback(item.id)}>
                        피드백 작성
                      </Button>
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
    </div>
  );
};

export default MyOrderDetailPage;