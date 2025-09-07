import { useEffect, useMemo, useState } from "react";
import Modal from "../common/Modal"; // ← modals/ 에서 common/ 으로 한 단계
import { getTracking, getShipmentTracking, getMyOrderDetail } from "../../service/orderService";

// 배송 응답 정규화(모달 내부 전용)
function normalizeTracking(raw) {
  if (!raw || typeof raw !== "object") return { carrierName: null, invoiceNo: null, events: [] };

  const carrierName =
    raw.carrierName ?? raw.courierName ?? raw.companyName ?? raw.carrier ?? null;
  const invoiceNo =
    raw.invoiceNo ?? raw.trackingNo ?? raw.invoice ?? raw.trackingNumber ?? null;

  const src = raw.events ?? raw.trackingDetails ?? raw.scanDetails ?? raw.timeline ?? [];
  const events = Array.isArray(src)
    ? src.map((e) => ({
        time:
          e.time ?? e.timeText ?? e.timeString ?? e.occurredAt ?? e.datetime ?? e.dateTime ?? null,
        status: e.status ?? e.statusText ?? e.kind ?? e.message ?? e.description ?? "",
        location: e.location ?? e.where ?? e.area ?? e.branch ?? "",
        description: e.description ?? e.detail ?? e.msg ?? "",
      }))
    : [];

  return { carrierName, invoiceNo, events };
}

export default function TrackingModal({ open, onClose, orderId }) {
  const [track, setTrack] = useState(null);   // 배송 데이터
  const [detail, setDetail] = useState(null); // 주문 상세
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        // 1) 배송 조회 (기존 getTracking 유지, 실패 시 getShipmentTracking 폴백)
        let t;
        try { t = await getTracking(orderId); }
        catch { t = await getShipmentTracking(orderId).catch(() => null); }
        if (!alive) return;
        setTrack(normalizeTracking(t));

        // 2) 주문 상세 조회 (상품/받는이/주소/요청사항/주문일 표시용)
        const d = await getMyOrderDetail(orderId).catch(() => null);
        if (!alive) return;
        setDetail(d);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [open, orderId]);

  // 표시에 쓰는 값들(주문 상세 기준)
  const orderedAt = useMemo(() =>
    detail?.createdAt ? new Date(detail.createdAt).toLocaleString('ko-KR') : '-', [detail]);

  const productSummary = useMemo(() => {
    const items = detail?.items || detail?.orderItems || detail?.orderItemList || [];
    if (!Array.isArray(items) || items.length === 0) return '-';
    const first = items[0];
    const name = first?.productName || first?.product?.name || first?.productNameSnapshot || '상품';
    return items.length > 1 ? `${name} 외 ${items.length - 1}건` : name;
  }, [detail]);

  const receiver  = detail?.receiver || '-';
  const phone     = detail?.phone || detail?.receiverPhone || '-';
  const address   = useMemo(() => {
    const a1 = detail?.addr1 || detail?.address1 || '';
    const a2 = detail?.addr2 || detail?.address2 || '';
    const zip = detail?.zipcode ? `(${detail.zipcode})` : '';
    return [a1, a2, zip].filter(Boolean).join(' ') || '-';
  }, [detail]);
  const request   = detail?.requestMemo || detail?.deliveryMemo || '-';

  // 배송 요약
  const carrierName = track?.carrierName ?? '-';
  const invoiceNo   = track?.invoiceNo ?? '-';

  return (
    <Modal isOpen={open} onClose={onClose} title="배송 조회">
      {loading ? (
        <div className="p-4">불러오는 중…</div>
      ) : (
        <div className="px-4">
          {/* 두 번째 이미지와 동일한 표 레이아웃, 기존 클래스 그대로 */}
          <table className="w-full table-fixed text-sm border-separate [border-spacing:0]">
            <tbody className="divide-y divide-gray-200">
              <tr>
                <th className="w-40 whitespace-nowrap bg-gray-50 px-4 py-2 text-center font-medium text-gray-600 align-top">
                  주문일
                </th>
                <td className="px-4 py-2 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {orderedAt}
                </td>
              </tr>
              <tr>
                <th className="w-40 whitespace-nowrap bg-gray-50 px-4 py-2 text-center font-medium text-gray-600 align-top">
                  상품명
                </th>
                <td className="px-4 py-2 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {productSummary}
                </td>
              </tr>
              <tr>
                <th className="w-40 whitespace-nowrap bg-gray-50 px-4 py-2 text-center font-medium text-gray-600 align-top">
                  받는이
                </th>
                <td className="px-4 py-2 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {receiver}
                </td>
              </tr>
              <tr>
                <th className="w-40 whitespace-nowrap bg-gray-50 px-4 py-2 text-center font-medium text-gray-600 align-top">
                  연락처
                </th>
                <td className="px-4 py-2 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {phone}
                </td>
              </tr>
              <tr>
                <th className="w-40 whitespace-nowrap bg-gray-50 px-4 py-2 text-center font-medium text-gray-600 align-top">
                  주소
                </th>
                <td className="px-4 py-2 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {address}
                </td>
              </tr>
              <tr>
                <th className="w-40 whitespace-nowrap bg-gray-50 px-4 py-2 text-center font-medium text-gray-600 align-top">
                  배송요청사항
                </th>
                <td className="px-4 py-2 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {request}
                </td>
              </tr>
              <tr>
                <th className="w-40 whitespace-nowrap bg-gray-50 px-4 py-2 text-center font-medium text-gray-600 align-top">
                  택배사
                </th>
                <td className="px-4 py-2 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {carrierName}
                </td>
              </tr>
              <tr>
                <th className="w-40 whitespace-nowrap bg-gray-50 px-4 py-2 text-center font-medium text-gray-600 align-top">
                  운송장
                </th>
                <td className="px-4 py-2 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  <span className="font-mono">{invoiceNo}</span>
                </td>
              </tr>
              <tr>
                <th className="w-40 whitespace-nowrap bg-gray-50 px-4 py-2 text-center font-medium text-gray-600 align-top">
                  배송 이력
                </th>
                <td className="px-4 py-2 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {Array.isArray(track?.events) && track.events.length > 0 ? (
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {track.events
                        .map((e, idx) => {
                          const t = e.time ? new Date(e.time).toLocaleString() : "-";
                          const line = `${idx + 1}. ${t} · ${e.status || ""}${e.location ? ` · ${e.location}` : ""}${e.description ? ` · ${e.description}` : ""}`;
                          return line;
                        })
                        .join("\n")}
                    </div>
                  ) : (
                    <span className="text-gray-500">이력이 없습니다.</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
