import { useEffect, useState } from "react";
import { getTracking } from "../../../service/orderService";

export default function TrackingModal({ open, onClose, orderId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!open) return;
    (async () => {
      try { setData(await getTracking(orderId)); } catch (e) { console.error(e); }
    })();
  }, [open, orderId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-2xl p-6">
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold">배송 조회</div>
          <button className="text-gray-500 hover:text-black" onClick={onClose}>닫기</button>
        </div>

        {!data ? (
          <div className="p-6">불러오는 중…</div>
        ) : (
          <>
            <div className="mt-2 text-sm text-gray-600">
              {data.carrierName ?? ""} · {data.invoiceNo ?? ""}
            </div>
            <ol className="mt-4 border-l pl-6 space-y-4 max-h-[60vh] overflow-auto">
              {(data.events ?? []).map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-3 top-1.5 w-2 h-2 bg-gray-400 rounded-full" />
                  <div className="text-sm">
                    {(e.time && new Date(e.time).toLocaleString()) || "-"} · {e.status || e.message || ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(e.branch || e.location || "")} {(e.description || "")}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
