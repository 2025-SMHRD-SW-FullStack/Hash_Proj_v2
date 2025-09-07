export default function ConfirmPurchaseModal({
  open,
  onClose,
  onConfirm,
  // ↓ 추가된 선택 props (기본값으로 기존 문구 유지)
  isEdit = false,                           // true면 "수정", false면 "작성"
  title = '구매 확정 안내',
  cancelText = '아니오',
  confirmText = '네, 구매 확정',
  subtitle,
}) {
  if (!open) return null;
  const verb = isEdit ? '수정' : '작성';

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl p-6">
        <div className="text-lg font-semibold">{title}</div>
        <p className="mt-3 text-sm text-gray-700">
          피드백을 {verb}하시려면 구매를 먼저 확정하셔야 합니다.
          <br />구매를 확정하시겠습니까?
        </p>
        {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button className="h-10 px-4 rounded-lg border hover:bg-gray-50" onClick={onClose}>
            {cancelText}
          </button>
          <button className="h-10 px-4 rounded-lg bg-gray-900 text-white hover:opacity-90" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
