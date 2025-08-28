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

  // 상세/아이템(상품명/옵션/가격/썸네일)
  const [detail, setDetail] = useState(null);
  // 트래킹(운송장/택배사 표기용)
  const [track, setTrack] = useState(null);
  // 피드백 완료 여부(확정 이후)
  const [feedbackDone, setFeedbackDone] = useState(false);

  // 모달
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openTrack, setOpenTrack] = useState(false);
  const [openReadyInfo, setOpenReadyInfo] = useState(false);

  // 상세 로드
  useEffect(() => {
    (async () => {
      try { setDetail(await getMyOrderDetail(order.id)); } catch (e) { /* optional */ }
    })();
  }, [order.id]);

  // 배송중/완료면 운송장/택배사 가져와 헤더에 표시
  useEffect(() => {
    if (order.status === "IN_TRANSIT" || order.status === "DELIVERED"|| order.status === "CONFIRMED") {
      (async () => {
        try { setTrack(await getTracking(order.id)); } catch (e) { /* optional */ }
      })();
    } else {
      setTrack(null);
    }
  }, [order.id, order.status]);

  // 확정/완료 시 피드백 완료 여부
  useEffect(() => {
    if (order.status === "DELIVERED" || order.status === "CONFIRMED") {
      (async () => {
        try { setFeedbackDone(await checkFeedbackDone(order.id)); } catch (e) { /* ignore */ }
      })();
    } else {
      setFeedbackDone(false);
    }
  }, [order.id, order.status]);

  // 카드 헤더 문구 (피그마: 배송중이면 주문번호 → 운송장+택배사)
  const headerLeft = useMemo(() => {
    if (order.status === "IN_TRANSIT" || order.status === "DELIVERED" || order.status === "CONFIRMED") {
      const inv = track?.invoiceNo ?? "-";
      const carr = track?.carrierName ?? "";
      return `운송장 번호 ${inv} ${carr ? `· ${carr}` : ""}`;
    }
    return `주문 번호 ${order.orderUid ?? order.id}`;
  }, [order.status, order.orderUid, order.id, track]);

  // 아이템 리스트 표시 준비
  const items = detail?.items ?? [];
  const totalPrice = Number(detail?.payAmount ?? detail?.totalPrice ?? order?.payAmount ?? 0);

  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{headerLeft}</div>
        <div className="inline-flex items-center gap-2">
          <span className="text-xs bg-gray-100 px-2.5 py-1 rounded-full">{statusLabel(order.status)}</span>
          <span className="text-xs text-gray-400">
            {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}
          </span>
        </div>
      </div>

      {/* 아이템 리스트 */}
      <div className="mt-4 space-y-3">
        {items.map((it) => (
          <OrderItemRow key={it.id} item={it} />
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-500">주문 상품 정보를 불러오는 중…</div>
        )}
      </div>

      {/* 합계/버튼 영역 */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm">
          <span className="text-gray-500">결제금액</span>{" "}
          <b>{totalPrice.toLocaleString()}원</b>
        </div>

        <div className="flex items-center gap-8">
          {/* 상태별 액션 */}
          {order.status === "READY" && (
            <>
              <button
                className="h-10 px-4 rounded-lg border hover:bg-gray-50"
                onClick={() => setOpenReadyInfo(true)}
              >
                배송 조회
              </button>
              <button
                className="h-10 px-4 rounded-lg border hover:bg-gray-50"
                onClick={() => navi(`/user/mypage/orders/${order.id}`)}
              >
                주문 상세 보기
              </button>
            </>
          )}

          {order.status === "IN_TRANSIT" && (
            <>
              <button
                className="h-10 px-4 rounded-lg border hover:bg-gray-50"
                onClick={() => setOpenTrack(true)}
              >
                배송 조회
              </button>
              <button
                className="h-10 px-4 rounded-lg border hover:bg-gray-50"
                onClick={() => navi(`/user/mypage/orders/${order.id}`)}
              >
                주문 상세 보기
              </button>
            </>
          )}

          {order.status === "DELIVERED" && (
            <>
              <button
                className="h-10 px-4 rounded-lg bg-gray-900 text-white hover:opacity-90"
                onClick={() => setOpenConfirm(true)}
              >
                피드백 작성하기
              </button>
              <button
                className="h-10 px-4 rounded-lg border hover:bg-gray-50"
                onClick={() => navi(`/support/exchange?orderId=${order.id}`)}
              >
                교환 신청
              </button>
            </>
          )}

          {order.status === "CONFIRMED" && (
            <>
              {feedbackDone ? (
                <>
                  <span className="inline-flex items-center text-sm rounded-full px-3 py-1 bg-green-100 text-green-800">
                    포인트 지급 완료
                  </span>
                  <button
                    className="h-10 px-4 rounded-lg border hover:bg-gray-50"
                    onClick={() => navi(`/user/mypage/orders/${order.id}?tab=feedback`)}
                  >
                    작성한 피드백 보기
                  </button>
                </>
              ) : (
                <span className="text-sm text-gray-500">구매확정 완료</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 모달들 */}
      <ConfirmPurchaseModal
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={async () => {
          try {
            // 1) 윈도우(가능 기간/상태) 먼저 확인
            const w = await getConfirmWindow(order.id);
            if (!w?.open) {
              // 남은 시간 있으면 안내에 붙여줌
              const remain =
                typeof w?.remainingSeconds === "number"
                  ? ` (남은 시간: ${Math.floor(w.remainingSeconds / 3600)}시간 ${Math.floor((w.remainingSeconds % 3600) / 60)}분)`
                  : "";
              alert(`지금은 구매확정을 할 수 없습니다.\n(배송완료 후 7일 이내만 가능)${remain}`);
              setOpenConfirm(false);
              return;
            }

            // 2) 가능하면 실제 확정 호출
            await confirmPurchase(order.id);
            setOpenConfirm(false);
            onChanged?.();

            // 확정 성공 후: 주문 상세로 이동 (아이템별 설문 진입 가정)
            navi(`/user/mypage/orders/${order.id}`);
          } catch (e) {
            // 인터셉터가 err.response?.data 또는 err.message를 넘기므로 아래처럼 메시지 우선 노출
            const msg =
              e?.message ||
              e?.error ||
              (typeof e === "string" ? e : "구매확정 중 오류가 발생했습니다.");
            alert(msg);
          }
        }}
      />

      <TrackingModal
        open={openTrack}
        onClose={() => setOpenTrack(false)}
        orderId={order.id}
      />

      <InfoModal
        open={openReadyInfo}
        onClose={() => setOpenReadyInfo(false)}
        title="배송 조회"
        message={"현재 상태: 배송 준비중\n집화가 시작되면 배송 조회가 가능합니다."}
      />
    </div>
  );
}

function OrderItemRow({ item }) {
  // 안전하게 필드 추출(프로젝트마다 약간씩 다름)
  const thumb = item.thumbnailUrl || item.imageUrl || item.productThumbnail || "";
  const name = item.productName || item.name || item.product?.name || "상품";
  const qty = Number(item.quantity ?? item.qty ?? 1);
  const unit = Number(item.unitPrice ?? item.price ?? 0);

  // 옵션 문자열 만들기
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
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : null}
      </div>
      <div className="flex-1">
        <div className="font-medium">{name}</div>
        {opts && <div className="text-sm text-gray-500">{opts}</div>}
        <div className="text-sm text-gray-600 mt-0.5">
          {qty}개 · {(unit * qty).toLocaleString()}원
        </div>
      </div>
    </div>
  );
}
