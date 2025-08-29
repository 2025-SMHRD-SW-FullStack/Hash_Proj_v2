// src/pages/user/myPage/OrderCard.jsx

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
import ExchangeRequestModal from "../../../components/myPage/modals/ExchangeRequestModal";

const statusLabel = (s) => ({
  READY: "배송 준비중",
  IN_TRANSIT: "배송 중",
  DELIVERED: "배송 완료",
  CONFIRMED: "구매 확정",
  PENDING: "결제 대기",
  PAID: "결제 완료",
}[s] || s);


// 개별 상품 옵션을 표시하는 컴포넌트 (수정됨: 더 콤팩트하게)
function VariationRow({ variation }) {
  const totalPrice = variation.quantity * variation.unitPrice;
  return (
    <div className="flex items-center text-sm text-gray-700">
      <span>{variation.options}</span>
      <span className="shrink-0 ml-2">{variation.quantity}개 · {totalPrice.toLocaleString()}원</span>
    </div>
  );
}

// 상품별로 그룹핑된 아이템을 표시하는 새로운 컴포넌트 (수정됨: 이미지 크기, 간격 조정)
function GroupedProductRow({ product }) {
  const thumb = product.thumbnailUrl || TestImg;
  return (
    <div className="flex items-start gap-4">
      {/* 이미지 크기 확대: w-24 h-24 로 변경 */}
      <div className="w-24 h-24 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
        <img src={thumb} alt={product.productName} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0"> {/* min-w-0 추가하여 텍스트 길어도 안 삐져나가게 */}
        <div className="font-medium text-base mb-2">{product.productName}</div> {/* 글자 크기, 마진 조정 */}
        <div className="space-y-1"> {/* 옵션 간 간격 조정 */}
          {product.variations.map(v => <VariationRow key={v.id} variation={v} />)}
        </div>
      </div>
    </div>
  );
}

const OrderCard = ({ order, onChanged }) => {
  const navi = useNavigate();

  const [detail, setDetail] = useState(null);
  const [track, setTrack] = useState(null);
  const [feedbackDone, setFeedbackDone] = useState(false);

  const [openConfirm, setOpenConfirm] = useState(false);
  const [openTrack, setOpenTrack] = useState(false);
  const [openReadyInfo, setOpenReadyInfo] = useState(false);
  const [openExchangeModal, setOpenExchangeModal] = useState(false);
  const [existingExchangeIds, setExistingExchangeIds] = useState(new Set()); // 이미 교환신청된 아이템 ID Set

  useEffect(() => {
    (async () => {
      try { setDetail(await getMyOrderDetail(order.id)); } catch (e) { console.error(e); }
    })();
  }, [order.id]);

  useEffect(() => {
    if (["IN_TRANSIT", "DELIVERED", "CONFIRMED"].includes(order.status)) {
      (async () => {
        try { setTrack(await getTracking(order.id)); } catch (e) { console.error(e); }
      })();
    } else setTrack(null);
  }, [order.id, order.status]);

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

  // 교환 모달 열기 핸들러
  const handleOpenExchangeModal = async () => {
    // 모달을 열기 전에, 현재 진행중인 교환 내역을 조회
    try {
      const exchanges = await getMyExchanges();
      const itemIdsInOrder = new Set(items.map(it => it.id));
      const requestedIds = new Set(
        exchanges
          .filter(ex => itemIdsInOrder.has(ex.orderItemId)) // 현재 주문에 포함된 교환 건만 필터링
          .map(ex => ex.orderItemId)
      );
      setExistingExchangeIds(requestedIds);
    } catch (e) {
      console.error("교환 내역 조회 실패:", e);
      // 실패하더라도 모달은 열리도록 빈 Set으로 초기화
      setExistingExchangeIds(new Set());
    }
    setIsExchangeModalOpen(true);
  };



  // 그룹핑 로직은 동일
  const groupedItems = useMemo(() => {
    if (!items || items.length === 0) return [];

    const groups = items.reduce((acc, item) => {
      const groupId = item.productId || item.productName;
      
      if (!acc[groupId]) {
        acc[groupId] = {
          groupId: groupId,
          productName: item.productName || item.name || item.product?.name || "상품",
          thumbnailUrl: item.thumbnailUrl || item.imageUrl || item.productThumbnail || "",
          variations: [],
        };
      }
      
      const optionValues = [];
      try {
        const opts = JSON.parse(item.optionSnapshotJson || '{}');
        Object.values(opts).forEach(v => { if(v) optionValues.push(String(v))});
      } catch(e) {}
      const optsString = optionValues.filter(Boolean).join(" / ") || "기본";

      acc[groupId].variations.push({
        id: item.id,
        options: optsString,
        quantity: Number(item.quantity ?? item.qty ?? 1),
        unitPrice: Number(item.unitPrice ?? item.price ?? 0),
      });

      return acc;
    }, {});

    return Object.values(groups);
  }, [items]);


  const handleReorder = () => {
    if (!items.length) {
        alert("주문 상품 정보를 불러올 수 없습니다.");
        return;
    }
    const firstProductId = items[0].productId;
    navi(`/product/${firstProductId}`);
  };

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

      {/* 아이템 리스트 (수정됨) */}
      {/* mb-4 추가로 아래 결제금액과의 간격 조정 */}
      <div className="mt-4 space-y-4 mb-4"> 
        {groupedItems.map((p) => <GroupedProductRow key={p.groupId} product={p} />)}
        {items.length === 0 && <div className="text-sm text-gray-500">주문 상품 정보를 불러오는 중…</div>}
      </div>

      {/* 합계/버튼 */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
            <span className="text-gray-500">결제금액</span>{" "}
            <b>{totalPrice.toLocaleString()}원</b>
        </div>

        <div className="flex items-center gap-4">
            {order.status === "PENDING" && (
                <Button onClick={handleReorder}>다시 주문하기</Button>
            )}
            {order.status === "READY" && (
                <Button variant="unselected" onClick={() => setOpenReadyInfo(true)}>배송 조회</Button>
            )}
            {order.status === "IN_TRANSIT" && (
                <Button variant="unselected" onClick={() => setOpenTrack(true)}>배송 조회</Button>
            )}
            {order.status === "DELIVERED" && (
                <>
                    <Button onClick={() => setOpenConfirm(true)}>
                        구매확정 후 피드백 작성
                    </Button>
                    <Button variant="unselected" onClick={() => setOpenExchangeModal(true)}>교환 신청</Button>
                </>
            )}
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
      <ExchangeRequestModal
        open={openExchangeModal}
        onClose={() => setOpenExchangeModal(false)}
        orderItems={items}
        onComplete={onChanged}
        existingExchangeIds={existingExchangeIds}
      />
    </div>
  );
}

export default OrderCard;