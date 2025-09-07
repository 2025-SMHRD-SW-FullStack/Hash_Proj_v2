import React from 'react';
import Modal from '../common/Modal'; // 1. 공용 Modal 컴포넌트를 import 합니다.
import Button from '../common/Button'; // 2. Button 컴포넌트도 import 합니다.

export default function ConfirmPurchaseModal({ open, onClose, onConfirm }) {
  // 3. Modal 컴포넌트를 사용하도록 코드를 수정합니다.
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="구매 확정 안내"
      maxWidth="max-w-md" // 기존 스타일과 유사하게 너비를 조정합니다.
      footer={
        // footer prop에 버튼들을 전달합니다.
        <>
          <Button variant="outline" onClick={onClose}>
            아니오
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            네, 구매 확정
          </Button>
        </>
      }
    >
      {/* children prop으로 모달의 본문 내용을 전달합니다. */}
      <p className="mt-3 text-sm text-gray-700">
        피드백을 작성하시려면 구매를 먼저 확정하셔야 합니다.
        <br />
        구매를 확정하시겠습니까?
      </p>
    </Modal>
  );
}