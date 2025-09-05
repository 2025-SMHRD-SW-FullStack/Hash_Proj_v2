// src/components/feedback/FeedbackSuccessModal.jsx
import React from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal'; // 기존에 만들어둔 Modal 컴포넌트 재활용

const FeedbackSuccessModal = ({ 
  isOpen, 
  onClose, 
  earnedPoints, 
  totalPoints, 
  onGoToProduct, 
  onGoToMyPage 
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✅ 피드백 제출 완료!">
      <div className="text-center p-4">
        <p className="text-lg text-gray-700 mb-4">
          소중한 피드백을 남겨주셔서 감사합니다!
        </p>
        <div className="space-y-2 text-base">
          <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
            <span className="text-gray-600">지급된 포인트</span>
            <span className="font-bold text-blue-600">+{earnedPoints.toLocaleString()} P</span>
          </div>
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
            <span className="text-gray-600">현재 보유 포인트</span>
            <span className="font-bold">{totalPoints.toLocaleString()} P</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FeedbackSuccessModal;