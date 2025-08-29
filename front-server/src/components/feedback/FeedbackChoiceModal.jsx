import React from 'react';
import Button from '../common/Button';
import RobotIcon from '../../assets/icons/ic_robot.svg'

// 아이콘 컴포넌트 (이전과 동일)
const PencilIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l12.232-12.232z"></path></svg>
);

// [수정] onClose prop은 이제 필수가 아닙니다.
export default function FeedbackChoiceModal({ open, onPickManual, onPickAI, onClose }) {
  if (!open) return null;

  return (
    // [수정] 배경 클릭 시 닫히지 않도록 onClick 이벤트 제거
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 " onClick={onClose} >
      <div className="bg-white w-full max-w-sm rounded-2xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-2">피드백 작성 방법을 골라주세요!</h2>
        <p className="text-sm text-gray-600 mb-6">설문이 제출되었습니다. 아래 방법 중 하나로 피드백을 작성하세요.</p>
        
        <div className="space-y-3">
          <Button 
            variant="outline" 
            size="lg"
            className="w-full h-16 text-lg"
            leftIcon={<PencilIcon />} 
            onClick={onPickManual}
          >
            수기 작성하기
          </Button>
          
          <Button 
            variant="outline"
            size="lg"
            className="w-full h-16 text-lg"
            leftIcon={<img src={RobotIcon} alt="AI 아이콘" className="w-5 h-5" />}
            onClick={onPickAI}
          >
            AI와 함께 대화하며 작성하기
          </Button>
        </div>
        
      </div>
    </div>
  );
}