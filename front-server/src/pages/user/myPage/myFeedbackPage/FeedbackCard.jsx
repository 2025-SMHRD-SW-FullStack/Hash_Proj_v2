import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TestImg from '../../../../assets/images/ReSsol_TestImg.png';

const FeedbackCard = ({ feedback }) => {
  const navigate = useNavigate();

  const imageUrls = useMemo(() => {
    try {
      return JSON.parse(feedback.imagesJson || '[]');
    } catch {
      return [];
    }
  }, [feedback.imagesJson]);

  return (
    <div
      className="w-44 border rounded-lg p-2 shadow-sm cursor-pointer 
                 hover:shadow-md hover:-translate-y-1 transition-all"
      onClick={() => navigate(`/user/feedback/${feedback.id}`)}
    >
      {/* 이미지 */}
      <img
        src={imageUrls[0] || TestImg}
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

        {/* 작성일 */}
        <p className="text-xs text-gray-400 mt-1">
          {new Date(feedback.createdAt).toLocaleDateString('ko-KR')}
        </p>
      </div>
    </div>
  );
};

export default FeedbackCard;
