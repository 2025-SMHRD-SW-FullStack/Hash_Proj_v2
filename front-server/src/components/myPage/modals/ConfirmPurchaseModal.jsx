export default function ConfirmPurchaseModal({ open, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl p-6">
        <div className="text-lg font-semibold">구매 확정 안내</div>
        <p className="mt-3 text-sm text-gray-700">
          피드백을 작성하시려면 구매를 먼저 확정하셔야 합니다.<br/>
          구매를 확정하시겠습니까?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="h-10 px-4 rounded-lg border border-gray-300 hover:bg-gray-50" onClick={onClose}>아니오</button>
          <button className="h-10 px-4 rounded-lg bg-gray-900 text-white hover:opacity-90" onClick={onConfirm}>네, 구매 확정</button>
        </div>
      </div>
    </div>
  );
}
