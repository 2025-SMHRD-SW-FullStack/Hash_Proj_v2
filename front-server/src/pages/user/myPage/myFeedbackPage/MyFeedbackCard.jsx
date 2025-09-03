import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TestImg from '../../../../assets/images/ReSsol_TestImg.png';

const MyFeedbackCard = ({ feedback }) => {
  const navigate = useNavigate();
  const [imgSrc, setImgSrc] = useState(feedback.productImageUrl || TestImg);

  const handleImageError = () => setImgSrc(TestImg);

  return (
    <div
      className="w-full bg-white border rounded-lg p-2 shadow-sm cursor-pointer
                 hover:shadow-md hover:-translate-y-0.5 transition-all"
      onClick={() => navigate(`/user/mypage/feedback/${feedback.id}`)}
    >
      {/* 정사각형 이미지 */}
      <div className="w-full aspect-square overflow-hidden rounded-md">
        <img
          src={imgSrc}
          onError={handleImageError}
          alt={feedback.productName || '상품 이미지'}
          className="w-full h-full object-cover"
        />
      </div>

      {/* 텍스트 영역 */}
      <div className="mt-1 space-y-0.5">
        <p className="text-sm font-medium truncate">{feedback.productName}</p>
        {feedback.optionName && (
          <p className="text-xs text-gray-500 truncate">{feedback.optionName}</p>
        )}
        <p className="text-xs text-gray-400">
          {new Date(feedback.createdAt).toLocaleDateString('ko-KR')}
        </p>
      </div>
    </div>
  );
};

export default MyFeedbackCard;
