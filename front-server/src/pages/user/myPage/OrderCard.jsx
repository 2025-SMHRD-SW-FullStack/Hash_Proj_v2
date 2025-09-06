import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyOrderDetail,
  getTracking,
  confirmPurchase,
  checkFeedbackDone,
  getConfirmWindow
} from "../../../service/orderService";
import ConfirmPurchaseModal from "../../../components/modals/ConfirmPurchaseModal";
import TrackingModal from "../../../components/modals/TrackingModal";
import ExchangeRequestModal from "../../../components/modals/ExchangeRequestModal";
import Button from "../../../components/common/Button";
import TestImg from '../../../assets/images/ReSsol_TestImg.png';
import { getMyExchanges } from "../../../service/exchangeService";
import Modal from "../../../components/common/Modal";

const statusLabel = (s) => ({
  READY: "배송 준비중",
  IN_TRANSIT: "배송 중",
  DELIVERED: "배송 완료",
  CONFIRMED: "구매 확정",
  PENDING: "결제 대기",
  PAID: "결제 완료",
}[s] || s);

function VariationRow({ variation }) {
  const totalPrice = variation.quantity * variation.unitPrice;
  return (
    <div className="flex items-center text-sm text-gray-700">
      <span>{variation.options}</span>
      <span className="shrink-0 ml-2">{variation.quantity}개 · {totalPrice.toLocaleString()}원</span>
    </div>
  );
}

function GroupedProductRow({ product }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-24 h-24 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
        <img 
          src={product.thumbnailUrl || TestImg} 
          alt={product.productName} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null; // 무한 루프 방지
            e.target.src = TestImg;
          }} 
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-base mb-2">{product.productName}</div>
        <div className="space-y-1">
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
  const [existingExchangeIds, setExistingExchangeIds] = useState(new Set());

  // 7일 윈도우 상태
  const [confirmWindow, setConfirmWindow] = useState({ open: true, remainingSeconds: null });

  const firstItem = useMemo(() => detail?.items?.[0], [detail]);

  useEffect(() => {
    (async () => { 
      try { 
        const detailData = await getMyOrderDetail(order.id);
        setDetail(detailData);
      } catch (e) { 
        console.error(e); 
      }
    })();
  }, [order.id]);

  // 구매확정/피드백 가능 윈도우 조회
  useEffect(() => {
    if (["DELIVERED", "CONFIRMED"].includes(order.status)) {
      (async () => {
        try {
          const w = await getConfirmWindow(order.id);
          setConfirmWindow({ open: Boolean(w?.open), remainingSeconds: w?.remainingSeconds ?? null });
        } catch {
          setConfirmWindow({ open: false, remainingSeconds: null });
        }
      })();
    } else {
      setConfirmWindow({ open: true, remainingSeconds: null });
    }
  }, [order.id, order.status]);

  // 피드백 존재 여부: 반드시 orderItemId로 체크
  useEffect(() => {
    if (firstItem && ["DELIVERED", "CONFIRMED"].includes(order.status)) {
      (async () => {
        try {
          const isDone = await checkFeedbackDone(firstItem.id);
          setFeedbackDone(isDone);
        } catch (e) {
          console.error(e);
          setFeedbackDone(false);
        }
      })();
    } else {
      setFeedbackDone(false);
    }
  }, [order.status, firstItem]);

  useEffect(() => {
    if (["IN_TRANSIT", "DELIVERED", "CONFIRMED"].includes(order.status)) {
      (async () => { try { setTrack(await getTracking(order.id)); } catch (e) { console.error(e); }})();
    } else setTrack(null);
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

  const handleOpenExchangeModal = async () => {
    try {
      const exchanges = await getMyExchanges();
      const itemIdsInOrder = new Set(items.map(it => it.id));
      const requestedIds = new Set(
        exchanges.filter(ex => itemIdsInOrder.has(ex.orderItemId)).map(ex => ex.orderItemId)
      );
      setExistingExchangeIds(requestedIds);
      setOpenExchangeModal(true);
    } catch (e) {
      alert('교환 내역을 조회하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      console.error("교환 내역 조회 실패:", e);
    }
  };

  const groupedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    const groups = items.reduce((acc, item) => {
      const groupId = item.productId || item.productName;
      if (!acc[groupId]) {
        acc[groupId] = {
          groupId,
          productName: item.productName || item.name || item.product?.name || "상품",
          thumbnailUrl: item.thumbnailUrl || item.imageUrl || item.productThumbnail || "",
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
        quantity: Number(item.quantity ?? item.qty ?? 1),
        unitPrice: Number(item.unitPrice ?? item.price ?? 0),
      });
      return acc;
    }, {});
    return Object.values(groups);
  }, [items]);

  // 윈도우 기반 상태
  const withinWindow = Boolean(confirmWindow?.open);

  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white">
      <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0 text-sm text-gray-600">
        <div className="text-sm text-gray-600">{headerLeft}</div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{statusLabel(order.status)}</span>
          <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}</span>
        </div>
      </div>

      <div className="mt-4 space-y-4 mb-4">
        {!detail ? (
          <div className="text-sm text-gray-500">주문 상품 정보 불러오는중...</div>
        ) : (
          groupedItems.map((p) => <GroupedProductRow key={p.groupId} product={p} />)
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-gray-500">결제금액</span>{" "}
          <b>{totalPrice.toLocaleString()}원</b>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {order.status === "PENDING" && <Button className="flex-1">다시 주문하기</Button>}
          {order.status === "READY" && <Button className="flex-1" variant="unselected" onClick={() => setOpenReadyInfo(true)}>배송 조회</Button>}
          {order.status === "IN_TRANSIT" && <Button className="flex-1" variant="unselected" onClick={() => setOpenTrack(true)}>배송 조회</Button>}
          
          {/* 배송완료: 구매확정 유도 */}
          {order.status === "DELIVERED" && !feedbackDone && (
            <>
              <Button className="flex-1" onClick={() => setOpenConfirm(true)}>구매확정 후 피드백 작성</Button>
              <Button className="flex-1" variant="signUp" onClick={handleOpenExchangeModal}>교환 신청</Button>
            </>
          )}

          {/* 구매확정 + 기간/완료 상태에 따른 버튼/라벨 */}
          {order.status === "CONFIRMED" && !feedbackDone && withinWindow && firstItem && (
            <Button
              className="flex-1"
              onClick={() => navi(`/user/survey?orderId=${order.id}`)} // ✅ 다건 주문 대응 (설문에서 선택)
            >
              피드백 작성
            </Button>
          )}

          {feedbackDone && withinWindow && firstItem && (
            <Button
              className="flex-1"
              variant="unselected"
              onClick={() =>
                navi(`/user/feedback/editor?orderItemId=${firstItem.id}&productId=${firstItem.productId}&feedbackId=auto&type=MANUAL`)
              }
            >
              피드백 수정
            </Button>
          )}

          {feedbackDone && !withinWindow && (
            <span className="inline-flex items-center text-sm rounded-full px-3 py-1 bg-green-100 text-green-800">
              피드백 작성 완료
            </span>
          )}

          {!feedbackDone && !withinWindow && (
            <span className="inline-flex items-center text-sm rounded-full px-3 py-1 bg-rose-100 text-rose-700">
              기간 만료
            </span>
          )}

          <Button className="flex-1" variant="unselected" onClick={() => navi(`/user/mypage/orders/${order.id}`)}>주문 상세 보기</Button>
        </div>
      </div>

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
              alert(`지금은 구매확정을 할 수 없습니다. (배송완료 후 7일 이내만 가능)${remain}`);
              setOpenConfirm(false);
              return;
            }
            await confirmPurchase(order.id);
            setOpenConfirm(false);
            onChanged?.();
            if (firstItem) {
              // 구매확정 후 설문 진입은 다건 대응 위해 orderId만 전달
              navi(`/user/survey?orderId=${order.id}`);
            }
          } catch (e) {
            const msg = e?.message || e?.error || (typeof e === "string" ? e : "구매확정 중 오류가 발생했습니다.");
            alert(msg);
          }
        }}
      />
      <TrackingModal open={openTrack} onClose={() => setOpenTrack(false)} orderId={order.id} />
      <Modal
        isOpen={openReadyInfo}
        onClose={() => setOpenReadyInfo(false)}
        title="배송 조회"
      >
        <p>현재 상태: 배송 준비중</p>
        <p> 집화가 시작되면 배송 조회가 가능합니다.</p>
      </Modal>
      <ExchangeRequestModal
        open={openExchangeModal}
        onClose={() => setOpenExchangeModal(false)}
        orderItems={items}
        onComplete={onChanged}
        existingExchangeIds={existingExchangeIds}
      />
    </div>
  );
};

export default OrderCard;
