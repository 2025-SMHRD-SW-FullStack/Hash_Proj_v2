import React from 'react';
import { useNavigate } from 'react-router-dom';
import TestImg from '../../../../assets/images/ReSsol_TestImg.png';

const MyFeedbackCard = ({ feedback }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/user/mypage/feedback/${feedback.id}`);
  };
  
  const getDisplayOptionsText = () => {
    if (!feedback.optionName || feedback.optionsCount === 0) {
      return null;
    }

    if (feedback.optionsCount > 1) {
      const firstOption = feedback.optionName.split(',')[0].trim();
      return `${firstOption} 외 ${feedback.optionsCount - 1}건`;
    }
    
    return feedback.optionName;
  };

  const optionsText = getDisplayOptionsText();

  return (
    <div
      className="cursor-pointer rounded-lg overflow-hidden group flex flex-col bg-white"
      onClick={handleClick}
    >
      <div className="aspect-w-1 aspect-h-1 bg-gray-100">
        <img
          src={feedback.productImageUrl || TestImg} // [수정] productThumbnailUrl -> productImageUrl
          alt={feedback.productName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
           onError={(e) => { e.target.onerror = null; e.target.src = TestImg; }}
        />
      </div>
      <div className="p-2 text-sm flex-grow flex flex-col justify-between">
        <div>
          <p className="font-bold truncate">{feedback.productName}</p>
          {optionsText && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              {optionsText}
            </p>
          )}
        </div>
        <p className="text-gray-600 truncate mt-2">{feedback.content}</p>
      </div>
    </div>
  );
};

export default MyFeedbackCard;