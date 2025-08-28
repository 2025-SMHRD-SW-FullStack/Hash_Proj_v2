export default function FeedbackChoiceModal({ open, onClose, onPickManual, onPickAI }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl p-6">
        <div className="text-lg font-semibold">피드백 작성 방식 선택</div>
        <p className="mt-2 text-sm text-gray-700">
          설문이 제출되었습니다. 아래 방법 중 하나로 피드백을 작성하세요.
        </p>
        <div className="mt-6 grid gap-3">
          <button className="btn btn-outline" onClick={onPickManual}>수기 작성</button>
          <button className="btn btn-primary" onClick={onPickAI}>AI 챗봇으로 작성</button>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="text-gray-500" onClick={onClose}>나중에</button>
        </div>
      </div>
    </div>
  );
}
