import { useState } from "react";
import { confirmPurchase } from "../../../service/orderService";
import ConfirmPurchaseModal from "../../../components/myPage/modals/ConfirmPurchaseModal";
import TrackingModal from "../../../components/myPage/modals/TrackingModal";
import { useNavigate } from "react-router-dom";

const statusLabel = (s) => ({
  PENDING: "결제 대기",
  PAID: "결제 완료",
  READY: "배송 준비중",
  IN_TRANSIT: "배송 중",
  DELIVERED: "배송 완료",
  CONFIRMED: "구매 확정",
}[s] || s);

export default function OrderCard({ order, onChanged }) {
  const navi = useNavigate();
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openTrack, setOpenTrack] = useState(false);

  const handleConfirm = async () => {
    try {
      await confirmPurchase(order.id);
      setOpenConfirm(false);
      onChanged?.();
      // 주문은 확정됨. 아이템 단위 피드백을 위해 상세로 보냄
      navi(`/user/mypage/orders/${order.id}`);
    } catch (e) {
      console.error(e);
      alert("구매확정 중 문제가 발생했습니다.");
    }
  };

  const Price = () => {
    const p = order.totalPrice ?? order.payAmount ?? 0;
    return <>{Number(p).toLocaleString()}원</>;
  };

  return (
    <div className="rounded-2xl border border-gray-200 p-4 flex items-start justify-between">
      <div className="space-y-1">
        <div className="text-sm text-gray-500">주문번호</div>
        <div className="font-medium">{order.orderUid ?? order.id}</div>
        <div className="text-sm text-gray-500">결제금액</div>
        <div className="font-medium"><Price /></div>
        {order.createdAt && (
          <div className="text-xs text-gray-400">
            {new Date(order.createdAt).toLocaleString()}
          </div>
        )}
      </div>

      <div className="flex items-center gap-10">
        <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">
          {statusLabel(order.status)}
        </span>

        {order.status === "CONFIRMED" ? (
          <span className="inline-flex items-center text-sm rounded-full px-3 py-1 bg-green-100 text-green-800">
            구매확정 : 포인트 지급 완료
          </span>
        ) : order.status === "DELIVERED" ? (
          <>
            <button
              onClick={() => setOpenConfirm(true)}
              className="h-10 px-4 rounded-lg bg-gray-900 text-white hover:opacity-90"
            >
              피드백 작성하기
            </button>
            <ConfirmPurchaseModal
              open={openConfirm}
              onClose={() => setOpenConfirm(false)}
              onConfirm={handleConfirm}
            />
          </>
        ) : order.status === "IN_TRANSIT" || order.status === "READY" ? (
          <>
            <button
              onClick={() => setOpenTrack(true)}
              className="h-10 px-4 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              배송 조회
            </button>
            <TrackingModal
              open={openTrack}
              onClose={() => setOpenTrack(false)}
              orderId={order.id}
            />
          </>
        ) : (
          <button
            onClick={() => navi(`/user/mypage/orders/${order.id}`)}
            className="h-10 px-4 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            주문 상세
          </button>
        )}
      </div>
    </div>
  );
}
