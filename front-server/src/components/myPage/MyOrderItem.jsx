import React from 'react';
import Button from '../common/Button';
import { useNavigate } from 'react-router-dom';
import TestImg from '../../assets/images/ReSsol_TestImg.png';

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
  const navigate = useNavigate();

  const formattedDate = new Date(order.createdAt).toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(/\. /g, '.');

  const handleOrderDetail = () => {
    navigate(`/user/mypage/orders/${order.id}`);
  };

  // 피드백 버튼 클릭 시, 상세 페이지로 안내 후 이동하는 함수
  const handleFeedbackClick = () => {
    alert("주문 상세 페이지에서 상품별로 피드백을 작성할 수 있습니다.");
    navigate(`/user/mypage/orders/${order.id}`);
  };

  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm">
      {/* --- 헤더: 요청하신 디자인 유지 --- */}
      <div className='flex items-center'>
        <h3 className="font-bold text-lg">{getStatusText(order.status)}&ensp;</h3>
        <p className="text-sm text-gray-500 mb-3">
          주문 번호 {order.orderUid} | {formattedDate} 주문
        </p>
      </div>

      {/* --- 본문: 요청하신 디자인 유지 + 내용 수정 --- */}
      <div className="flex justify-center items-center">
        <div className="w-24 h-24 bg-gray-200 rounded-lg mr-4 flex-shrink-0">
          <img src={TestImg} alt="주문 대표 이미지" className="w-full h-full object-cover rounded-lg" />
        </div>
        <div className="flex-grow">
          {/* [수정] 상품명/옵션 대신 안내 문구와 결제 금액 표시 */}
          <p><strong>결제 금액:</strong> {order.payAmount.toLocaleString()}원</p>
          <p className="text-sm text-gray-600 mt-1">
            상세 상품 정보는 '주문 상세 보기'를 통해 확인해주세요.
          </p>
        </div>
      </div>

      {/* --- 푸터: 요청하신 디자인 유지 + 핸들러 연결 --- */}
      <div className="flex justify-start gap-2 mt-4">
        {(order.status === 'PAID' || order.status === 'IN_TRANSIT') && <><Button variant="unselected">배송 조회</Button></>}
        {/* [수정] onClick 핸들러를 handleFeedbackClick으로 변경 */}
        {order.status === 'DELIVERED' && <><Button onClick={handleFeedbackClick}>피드백 작성하기</Button><Button variant="unselected">교환 신청</Button></>}
        {order.status === 'CONFIRMED' && <Button variant="unselected" disabled>포인트 지급 완료</Button>}
        <Button variant="unselected" onClick={handleOrderDetail}>주문 상세 보기</Button>
      </div>
    </div>
  );
};

export default MyOrderItem;
