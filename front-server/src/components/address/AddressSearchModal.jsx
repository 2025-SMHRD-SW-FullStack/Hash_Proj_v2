import React from "react";
import DaumPostcode from "react-daum-postcode";
import Modal from "../common/Modal.jsx"; // 1. 공용 Modal 컴포넌트를 import합니다.

export default function AddressSearchModal({ open, onClose, onSelect }) {
  // 2. 불필요해진 useEffect와 조건부 렌더링을 제거합니다.

  return (
    // 3. 기존 div 구조 대신 Modal 컴포넌트를 사용합니다.
    <Modal
      isOpen={open}
      onClose={onClose}
      title="주소 검색"
      maxWidth="max-w-lg" // 기존 너비(520px)와 유사하게 설정
    >
      <div className="border rounded-lg overflow-hidden mt-4">
        <DaumPostcode
          onComplete={(data) => {
            const addr1 = data.roadAddress || data.jibunAddress;
            const zipcode = data.zonecode;
            onSelect?.({ addr1, zipcode });
            onClose?.(); // 주소 선택 시 모달이 닫히도록 onClose 호출
          }}
          autoClose
          animation
        />
      </div>
    </Modal>
  );
}