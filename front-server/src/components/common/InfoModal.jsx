export default function InfoModal({ open, onClose, title = "안내", message = "" }) {
  if (!open) return null;

  // 문자열이면 \n을 살려서 렌더, ReactNode도 그대로 허용
  const content =
    typeof message === "string" ? (
      <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">{message}</p>
    ) : (
      message
    );

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl p-6">
        <div className="text-lg font-semibold">{title}</div>
        {content}
        <div className="mt-6 flex justify-end">
          <button
            className="h-10 px-4 rounded-lg bg-gray-900 text-white hover:opacity-90"
            onClick={onClose}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
