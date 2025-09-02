import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../../config/axiosInstance";

export default function PayFail() {
  const [sp] = useSearchParams();
  const navi = useNavigate();

  const orderId = sp.get("orderId") || "";
  const code = sp.get("code") || "UNKNOWN";
  const message =
    sp.get("message") || "결제가 취소되었거나 실패했습니다.";

  const [serverNote, setServerNote] = useState("서버에 실패 정보를 전달 중…");

  useEffect(() => {
    // 서버에 실패/취소 전달(포인트 선차감 복구 등)
    if (!orderId) {
      setServerNote("orderId 가 없어 서버 통보를 생략했습니다.");
      return;
    }
    (async () => {
      try {
        await api.get("/api/payments/toss/fail", {
          params: { orderId, message, code },
        });
        setServerNote("서버 롤백 처리(포인트 복구 등) 완료");
      } catch {
        setServerNote("서버에 실패 통보 중 오류가 발생했습니다.");
      }
    })();
  }, [orderId, message, code]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-4">결제 실패</h1>

      <div className="rounded-lg bg-red-50 text-red-700 p-4 mb-4">
        <div className="font-medium mb-1">사유: {code}</div>
        <div className="text-sm whitespace-pre-line">{message}</div>
      </div>

      <div className="rounded-lg bg-gray-50 text-gray-700 p-4">
        <div className="text-sm">{serverNote}</div>
        {orderId && (
          <div className="text-xs mt-2 text-gray-500">orderId: {orderId}</div>
        )}
      </div>

      <button
        onClick={() => navi(-1)}
        className="mt-6 h-10 px-4 rounded-lg border hover:bg-gray-50"
      >
        돌아가기
      </button>
    </div>
  );
}
