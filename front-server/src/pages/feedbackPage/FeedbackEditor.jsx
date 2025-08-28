import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { submitFeedback } from "../../service/feedbackService";

export default function FeedbackEditor() {
  const [sp] = useSearchParams();
  const navi = useNavigate();
  const orderItemId = sp.get("orderItemId");
  const type = sp.get("type") || "MANUAL";

  const [content, setContent] = useState("");

  const submit = async () => {
    if (!orderItemId) {
      alert("orderItemId가 없습니다.");
      return;
    }
    try {
      await submitFeedback(Number(orderItemId), { type, content });
      alert("피드백이 저장되었습니다. 포인트가 지급됩니다.");
      navi("/user/mypage/orders");
    } catch (e) {
      console.error(e);
      alert("피드백 저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">피드백 작성 ({type === "AI" ? "AI" : "수기"})</h1>

      {/* TODO: type === "AI"일 때 실제 챗봇 UI 연결 */}
      <textarea
        className="w-full h-60 border rounded-xl p-3"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={type === "AI" ? "AI가 생성한 초안을 확인/수정하세요." : "상품을 사용해보니..."}
      />

      <div className="flex justify-end">
        <button
          onClick={submit}
          className="h-10 px-4 rounded-lg bg-gray-900 text-white hover:opacity-90"
        >
          제출
        </button>
      </div>
    </div>
  );
}
