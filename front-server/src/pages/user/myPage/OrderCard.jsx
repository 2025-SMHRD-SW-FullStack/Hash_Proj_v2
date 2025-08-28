import { useState } from "react";
import { confirmPurchase } from "../../../service/orderService";
import ConfirmPurchaseModal from "../../../components/myPage/modals/ConfirmPurchaseModal";
import TrackingModal from "../../../components/myPage/modals/TrackingModal";
import { useNavigate } from "react-router-dom";
import TestImg from '../../../assets/images/ReSsol_TestImg.png'; // 상품 이미지 예시
import Button from "../../../components/common/Button"; // Button 컴포넌트 사용

// 주문 상태 한글 변환 함수
const statusLabel = (s) => ({
  PENDING: "결제 대기",
  PAID: "결제 완료",
  READY: "배송 준비중",
  IN_TRANSIT: "배송 중",
  DELIVERED: "배송 완료",
  CONFIRMED: "구매 확정",
}[s] || s);

// 날짜 포맷 함수
const formatDate = (dateString) => new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
}).replace(/\. /g, '.');

export default function OrderCard({ order, onChanged }) {
  const navi = useNavigate();
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openTrack, setOpenTrack] = useState(false);

  // 구매 확정 로직 (기존과 동일)
  const handleConfirm = async () => {
    try {
      await confirmPurchase(order.id);
      setOpenConfirm(false);
      onChanged?.(); // 목록 새로고침
      // 상세 페이지로 이동하여 상품별 피드백 작성 유도
      navi(`/user/mypage/orders/${order.id}`);
    } catch (e) {
      console.error(e);
      const errorMsg = e?.message || "구매확정 중 문제가 발생했습니다.";
      alert(errorMsg);
    }
  };

  return (
    // MyOrderItem.jsx의 레이아웃 구조를 가져옵니다.
    <div className="border rounded-lg p-4 mb-4 shadow-sm">
      {/* --- 헤더: 주문 상태, 번호, 날짜 --- */}
      <div className='flex items-center mb-4'>
        <h3 className="font-bold text-lg">{statusLabel(order.status)}&ensp;</h3>
        <p className="text-sm text-gray-500">
          주문 번호 {order.orderUid} | {formatDate(order.createdAt)} 주문
        </p>
      </div>

      {/* --- 본문: 상품 정보 요약 --- */}
      <div className="flex justify-start items-center">
        <div className="w-24 h-24 bg-gray-200 rounded-lg mr-4 flex-shrink-0">
          <img src={TestImg} alt="주문 대표 이미지" className="w-full h-full object-cover rounded-lg" />
        </div>
        <div className="flex-grow">
          <p className="font-semibold">결제 금액: {order.payAmount.toLocaleString()}원</p>
          <p className="text-sm text-gray-600 mt-1">
            상세 상품 정보는 '주문 상세 보기'를 통해 확인해주세요.
          </p>
        </div>
      </div>

      {/* --- 푸터: 상태에 따른 버튼 표시 --- */}
      <div className="flex justify-start gap-2 mt-4">
        {/* 배송 준비중 또는 배송 중일 때 */}
        {(order.status === 'READY' || order.status === 'IN_TRANSIT') && (
          <Button variant="unselected" onClick={() => setOpenTrack(true)}>배송 조회</Button>
        )}
        
        {/* 배송 완료일 때 */}
        {order.status === 'DELIVERED' && (
          <>
            <Button onClick={() => setOpenConfirm(true)}>피드백 작성하기</Button>
            <Button variant="unselected">교환 신청</Button>
          </>
        )}

        {/* 구매 확정일 때 */}
        {order.status === 'CONFIRMED' && (
          <Button variant="unselected" disabled>포인트 지급 완료</Button>
        )}

        {/* 대부분의 상태에서 공통으로 보이는 버튼 */}
        <Button variant="unselected" onClick={() => navi(`/user/mypage/orders/${order.id}`)}>
          주문 상세 보기
        </Button>
      </div>

      {/* --- 모달 (보이지 않지만 기능에 필요) --- */}
      <ConfirmPurchaseModal
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleConfirm}
      />
      <TrackingModal
        open={openTrack}
        onClose={() => setOpenTrack(false)}
        orderId={order.id}
      />
    </div>
  );
}