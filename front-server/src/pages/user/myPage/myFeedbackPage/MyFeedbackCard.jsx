import React from 'react';
import { useNavigate } from 'react-router-dom';
import TestImg from '../../../../assets/images/ReSsol_TestImg.png';

const MyFeedbackCard = ({ feedback }) => {
  const navigate = useNavigate();

  // 'useMemo'를 사용한 이미지 파싱 로직을 제거했습니다.

  return (
    <div
      className="w-44 border rounded-lg p-2 shadow-sm cursor-pointer 
                 hover:shadow-md hover:-translate-y-1 transition-all"
      // ✅ 사용자 ID가 포함된 경로로 수정합니다.
      onClick={() => navigate(`/my-page/feedbacks/${feedback.id}`)}
    >
      {/* 이미지 */}
      <img
        // ✅ src를 feedback.productImageUrl로 변경합니다.
        //    productImageUrl이 없으면 TestImg를 보여줍니다.
        src={feedback.productImageUrl || TestImg}
        alt={feedback.productName || '상품 이미지'}
        className="w-full h-32 object-cover rounded-md"
      />

      <div className="mt-2">
        {/* 상품명 */}
        <p className="text-sm font-medium truncate">
          {feedback.productName}
        </p>

        {/* 옵션명 */}
        {feedback.optionName && (
          <p className="text-xs text-gray-500 truncate">
            {feedback.optionName}
          </p>
        )}

        {/* 작성일 (기존 코드와 동일) */}
        <p className="text-xs text-gray-400 mt-1">
          {new Date(feedback.createdAt).toLocaleDateString('ko-KR')}
        </p>
      </div>
    </div>
  );
};

export default MyFeedbackCard;