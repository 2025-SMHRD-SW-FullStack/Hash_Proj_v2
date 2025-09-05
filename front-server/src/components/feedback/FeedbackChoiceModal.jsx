import React from "react";
import ReactDOM from "react-dom";
import Button from "../common/Button";
import RobotIcon from "../../assets/icons/ic_robot.svg";

const PencilIcon = () => (
  <svg
    className="w-5 h-5"
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
  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center px-4">
      <div
        className="bg-white w-full max-w-sm sm:max-w-md md:max-w-lg rounded-2xl p-6 sm:p-8 text-center max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg sm:text-xl font-bold mb-2">
          피드백 작성 방법을 골라주세요!
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          설문이 제출되었습니다. 아래 방법 중 하나로 피드백을 작성하세요.
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
                className="w-4 sm:w-5 h-4 sm:h-5"
              />
            }
            onClick={onPickAI}
          >
            AI와 함께 대화하며 작성하기
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
