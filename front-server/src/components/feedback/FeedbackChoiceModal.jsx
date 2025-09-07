import React from "react";
import Modal from "../common/Modal.jsx"; // 1. 공용 Modal 컴포넌트를 import합니다.
import Button from "../common/Button.jsx";
import RobotIcon from "../../assets/icons/ic_robot.svg";

const PencilIcon = () => (
  <svg
    className="w-5 h-5 mb-1 "
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l12.232-12.232z"
    ></path>
  </svg>
);

export default function FeedbackChoiceModal({
  open,
  onPickManual,
  onPickAI,
  onClose,
}) {
  // 2. 기존의 ReactDOM.createPortal과 div 구조 대신 Modal 컴포넌트를 사용합니다.
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="피드백 작성 방법을 골라주세요!"
      maxWidth="max-w-lg" // 기존 스타일과 유사하게 너비를 설정합니다.
    >
      {/* 3. 모달의 본문 내용을 children으로 전달합니다. */}
      <div className="text-center p-4">
        <p className="flex flex-col text-sm sm:text-base text-gray-600 mb-6">
          <span>설문이 제출되었습니다.</span>
          <span>아래 방법 중 하나로 피드백을 작성하세요.</span>
        </p>

        <div className="space-y-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 sm:h-16 text-base sm:text-lg"
            leftIcon={<PencilIcon />}
            onClick={onPickManual}
          >
            수기 작성하기
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 sm:h-16 text-base sm:text-lg"
            leftIcon={
              <img
                src={RobotIcon}
                alt="AI 아이콘"
                className="!w-5 !h-5 mb-1 mr-0.5"
              />
            }
            onClick={onPickAI}
          >
            AI와 함께 대화하며 작성하기
          </Button>
        </div>
      </div>
    </Modal>
  );
}

