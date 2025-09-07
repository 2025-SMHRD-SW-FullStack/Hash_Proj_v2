import React from 'react';
import Modal from '../common/Modal.jsx'; // 공용 Modal 컴포넌트 import
import Button from '../common/Button.jsx'; // 공용 Button 컴포넌트 import

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
  const verb = isEdit ? '수정' : '작성'; // 동사 (수정/작성)

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="p-4">
        <p className="text-sm text-gray-700">
          피드백을 {verb}하시려면 구매를 먼저 확정하셔야 합니다.
          <br />
          구매를 확정하시겠습니까?
        </p>
        {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
      </div>
    </Modal>
  );
}

