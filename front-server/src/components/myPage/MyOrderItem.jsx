import React from 'react';
import Button from '../common/Button';
import { useNavigate } from 'react-router-dom';

// 주문 상태 한글 변환 함수
const getStatusText = (status) => {
  switch (status) {
    case 'PENDING': return '결제 대기중';
    case 'PAID': return '주문 완료';
    case 'READY': return '배송 준비중';
    case 'IN_TRANSIT': return '배송 중';
    case 'DELIVERED': return '배송 완료';
    case 'CONFIRMED': return '구매 확정';
    default: return status;
  }
};

const MyOrderItem = ({ order }) => {
  const formattedDate = new Date(order.createdAt).toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(/\. /g, '.');

  const navigate = useNavigate()

  const handleFeedback = () => {
    navigate('/user/survey')
  }

  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm">
        <div className='flex items-center'>
            <h3 className="font-bold text-lg">{getStatusText(order.status)}&ensp;</h3>
            <p className="text-sm text-gray-500 mb-3">
                주문 번호 {order.orderUid} | {formattedDate} 주문
            </p>
        </div>
      <div className="flex justify-center items-center">
        <div className="w-24 h-24 bg-gray-200 rounded-lg mr-4 flex-shrink-0">
          {/* 상품 썸네일 이미지 */}
        </div>
        <div className="flex-grow">
          <p><strong>상품명:</strong> [상품명 Placeholder]</p>
          <p><strong>옵션:</strong> [옵션 Placeholder]</p>
          <p><strong>결제 금액:</strong> {order.payAmount.toLocaleString()}원</p>
        </div>
      </div>
      <div className="flex justify-start gap-2 mt-4">
        {(order.status === 'PAID' || order.status === 'IN_TRANSIT') && <><Button variant="unselected">배송 조회</Button></>}
        {order.status === 'DELIVERED' && <><Button onClick={handleFeedback}>피드백 작성하기</Button><Button variant="unselected">교환 신청</Button></>}
        {order.status === 'CONFIRMED' && <Button variant="unselected" disabled>포인트 지급 완료</Button>}
        <Button variant="unselected">주문 상세 보기</Button>
      </div>
    </div>
  );
};

export default MyOrderItem