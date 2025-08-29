import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyOrderDetail,
  getTracking,
  confirmPurchase,
  checkFeedbackDone,
  getConfirmWindow
} from "../../../service/orderService";
import ConfirmPurchaseModal from "../../../components/myPage/modals/ConfirmPurchaseModal";
import TrackingModal from "../../../components/myPage/modals/TrackingModal";
import InfoModal from "../../../components/common/InfoModal";
import Button from "../../../components/common/Button";
import TestImg from '../../../assets/images/ReSsol_TestImg.png';

const statusLabel = (s) => ({
  READY: "배송 준비중",
  IN_TRANSIT: "배송 중",
  DELIVERED: "배송 완료",
  CONFIRMED: "구매 확정",
  PENDING: "결제 대기",
  PAID: "결제 완료",
}[s] || s);

export default function OrderCard({ order, onChanged }) {
  const navi = useNavigate();

  const [detail, setDetail] = useState(null);
  const [track, setTrack] = useState(null);
  const [feedbackDone, setFeedbackDone] = useState(false);

  const [openConfirm, setOpenConfirm] = useState(false);
  const [openTrack, setOpenTrack] = useState(false);
  const [openReadyInfo, setOpenReadyInfo] = useState(false);

  // 주문 상세
  useEffect(() => {
    (async () => {
      try { setDetail(await getMyOrderDetail(order.id)); } catch (e) { console.error(e); }
    })();
  }, [order.id]);

  // 배송 상태별 트래킹
  useEffect(() => {
    if (["IN_TRANSIT", "DELIVERED", "CONFIRMED"].includes(order.status)) {
      (async () => {
        try { setTrack(await getTracking(order.id)); } catch (e) { console.error(e); }
      })();
    } else setTrack(null);
  }, [order.id, order.status]);

  // 피드백 완료 여부
  useEffect(() => {
    if (["DELIVERED", "CONFIRMED"].includes(order.status)) {
      (async () => {
        try { setFeedbackDone(await checkFeedbackDone(order.id)); } catch (e) { console.error(e); }
      })();
    } else setFeedbackDone(false);
  }, [order.id, order.status]);

  const headerLeft = useMemo(() => {
    if (["IN_TRANSIT", "DELIVERED", "CONFIRMED"].includes(order.status)) {
      const inv = track?.invoiceNo ?? "-";
      const carr = track?.carrierName ?? "";
      return `운송장 번호 ${inv}${carr ? ` · ${carr}` : ""}`;
    }
    return `주문 번호 ${order.orderUid ?? order.id}`;
  }, [order.status, order.orderUid, order.id, track]);

  const items = detail?.items ?? [];
  const totalPrice = Number(detail?.payAmount ?? detail?.totalPrice ?? order?.payAmount ?? 0);

  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{headerLeft}</div>
        <div className="inline-flex items-center gap-2">
          <span className="text-xs bg-gray-100 px-2.5 py-1 rounded-full">{statusLabel(order.status)}</span>
          <span className="text-xs text-gray-400">{order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}</span>
        </div>
      </div>

      {/* 아이템 리스트 */}
      <div className="mt-4 space-y-3">
        {items.map((it) => <OrderItemRow key={it.id} item={it} />)}
        {items.length === 0 && <div className="text-sm text-gray-500">주문 상품 정보를 불러오는 중…</div>}
      </div>

      {/* 합계/버튼 */}
      <div className="mt-4 flex items-center justify-between">
    <div className="text-sm">
        <span className="text-gray-500">결제금액</span>{" "}
        <b>{totalPrice.toLocaleString()}원</b>
    </div>

    <div className="flex items-center gap-4">
        {/* READY */}
        {order.status === "READY" && (
            <Button variant="unselected" onClick={() => setOpenReadyInfo(true)}>배송 조회</Button>
        )}

        {/* IN_TRANSIT */}
        {order.status === "IN_TRANSIT" && (
            <Button variant="unselected" onClick={() => setOpenTrack(true)}>배송 조회</Button>
        )}

        {/* DELIVERED */}
        {order.status === "DELIVERED" && (
            <>
                <Button onClick={() => setOpenConfirm(true)}>
                    구매확정 후 피드백 작성
                </Button>
                <Button variant="unselected" onClick={() => navi(`/support/exchange?orderId=${order.id}`)}>교환 신청</Button>
            </>
        )}

        {/* CONFIRMED */}
        {order.status === "CONFIRMED" && (
            <>
                {!feedbackDone ? (
                    <Button onClick={() => navi(`/user/mypage/orders/${order.id}?tab=feedback`)}>
                        피드백 작성
                    </Button>
                ) : (
                    <span className="inline-flex items-center text-sm rounded-full px-3 py-1 bg-green-100 text-green-800">
                        포인트 지급 완료
                    </span>
                )}
            </>
        )}
        
        {/* 모든 주문 상태에서 항상 표시되도록 위치 변경 */}
        <Button variant="unselected" onClick={() => navi(`/user/mypage/orders/${order.id}`)}>
            주문 상세 보기
        </Button>
    </div>
</div>

      {/* 모달 */}
      <ConfirmPurchaseModal
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={async () => {
          try {
            const w = await getConfirmWindow(order.id);
            if (!w?.open) {
              const remain = typeof w?.remainingSeconds === "number"
                ? ` (남은 시간: ${Math.floor(w.remainingSeconds / 3600)}시간 ${Math.floor((w.remainingSeconds % 3600) / 60)}분)`
                : "";
              alert(`지금은 구매확정을 할 수 없습니다.\n(배송완료 후 7일 이내만 가능)${remain}`);
              setOpenConfirm(false);
              return;
            }
            await confirmPurchase(order.id);
            setOpenConfirm(false);
            onChanged?.();
            navi(`/user/mypage/orders/${order.id}?tab=feedback`);
          } catch (e) {
            const msg = e?.message || e?.error || (typeof e === "string" ? e : "구매확정 중 오류가 발생했습니다.");
            alert(msg);
          }
        }}
      />

      <TrackingModal open={openTrack} onClose={() => setOpenTrack(false)} orderId={order.id} />
      <InfoModal open={openReadyInfo} onClose={() => setOpenReadyInfo(false)} title="배송 조회" message={"현재 상태: 배송 준비중\n집화가 시작되면 배송 조회가 가능합니다."} />
    </div>
  );
}

function OrderItemRow({ item }) {
  const thumb = item.thumbnailUrl || item.imageUrl || item.productThumbnail || "";
  const name = item.productName || item.name || item.product?.name || "상품";
  const qty = Number(item.quantity ?? item.qty ?? 1);
  const unit = Number(item.unitPrice ?? item.price ?? 0);

  const optionValues = [];
  const pushIf = (v) => { if (v) optionValues.push(String(v)); };
  pushIf(item.option1Value || item.options?.option1Value || item.options?.option1);
  pushIf(item.option2Value || item.options?.option2Value || item.options?.option2);
  pushIf(item.option3Value || item.options?.option3Value || item.options?.option3);
  pushIf(item.option4Value || item.options?.option4Value || item.options?.option4);
  pushIf(item.option5Value || item.options?.option5Value || item.options?.option5);
  const opts = optionValues.filter(Boolean).join(" / ");

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
        {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <img src={TestImg} alt="상품 이미지" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1">
        <div className="font-medium">{name}</div>
        {opts && <div className="text-sm text-gray-500">{opts}</div>}
        <div className="text-sm text-gray-600 mt-0.5">{qty}개 · {(unit * qty).toLocaleString()}원</div>
      </div>
    </div>
  );
}
