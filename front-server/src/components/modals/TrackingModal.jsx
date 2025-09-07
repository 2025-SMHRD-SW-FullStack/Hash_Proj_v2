import { useEffect, useMemo, useState } from "react";
import Modal from "../common/Modal"; // ← modals/ 에서 common/ 으로 한 단계
import { getTracking, getShipmentTracking, getMyOrderDetail } from "../../service/orderService";
import { normalizeTracking } from "../../adapters/tracking";

// 브라우저 호환 날짜 포맷 ("YYYY-MM-DD HH:mm" 등)
const formatKST = (t) => {
  if (!t) return "-";
  let s = String(t).trim();
  if (!s.includes("T")) s = s.replace(/[./]/g, "-").replace(" ", "T");
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? String(t) : d.toLocaleString("ko-KR");
};

export default function TrackingModal({ open, onClose, orderId }) {
  const [track, setTrack] = useState(null);   // 배송 데이터(정규화)
  const [detail, setDetail] = useState(null); // 주문 상세
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        // 1) 배송 조회 (getTracking → 실패 시 /shipments/{id}/tracking)
        let t;
        try { t = await getTracking(orderId); }
        catch { t = await getShipmentTracking(orderId).catch(() => null); }
        if (!alive) return;
        setTrack(normalizeTracking(t || {}));

        // 2) 주문 상세 조회
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
  const orderedAt = useMemo(
    () => (detail?.createdAt ? new Date(detail.createdAt).toLocaleString("ko-KR") : "-"),
    [detail]
  );

  const productSummary = useMemo(() => {
    const items = detail?.items || detail?.orderItems || detail?.orderItemList || [];
    if (!Array.isArray(items) || items.length === 0) return "-";
    const first = items[0];
    const name = first?.productName || first?.product?.name || first?.productNameSnapshot || "상품";
    return items.length > 1 ? `${name} 외 ${items.length - 1}건` : name;
  }, [detail]);

  const receiver  = detail?.receiver || "-";
  const phone     = detail?.phone || detail?.receiverPhone || "-";
  const address   = useMemo(() => {
    const a1 = detail?.addr1 || detail?.address1 || "";
    const a2 = detail?.addr2 || detail?.address2 || "";
    const zip = detail?.zipcode ? `(${detail.zipcode})` : "";
    return [a1, a2, zip].filter(Boolean).join(" ") || "-";
  }, [detail]);
  const request   = detail?.requestMemo || detail?.deliveryMemo || "-";

  // 배송 요약
  const carrierName = track?.carrierName || track?.carrier?.name || "-";
  const invoiceNo   = track?.invoiceNo ?? "-";

  return (
    <Modal isOpen={open} onClose={onClose} title="배송 조회">
      {loading ? (
        <div className="p-4">불러오는 중…</div>
      ) : (
        <div className="px-4">
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
                          const t = formatKST(e.time);
                          const line = `${idx + 1}. ${t} · ${(e.label || e.status || "")}${e.where ? ` · ${e.where}` : ""}${e.description ? ` · ${e.description}` : ""}`;
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
