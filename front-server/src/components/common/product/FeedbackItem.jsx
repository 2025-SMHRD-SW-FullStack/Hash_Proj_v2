// src/components/common/product/FeedbackItem.jsx
import React, { useMemo, useState } from 'react';
import PersonIcon from '../../../assets/icons/ic_person.svg';

const FeedbackItem = ({ feedback }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // JSON으로 된 이미지 URL 목록을 파싱합니다.
  const imageUrls = useMemo(() => {
    try {
      return JSON.parse(feedback.imagesJson || '[]');
    } catch {
      return [];
    }
  }, [feedback.imagesJson]);

  // 피드백 내용이 길 경우 '더보기'/'접기' 기능을 제공합니다.
  const needsTruncation = feedback.content.length > 150;
  const displayText = isExpanded ? feedback.content : `${feedback.content.slice(0, 150)}${needsTruncation ? '...' : ''}`;

  // ✅ [수정] 백엔드에서 받은 실제 작성자 정보를 사용합니다.
  // authorProfileImageUrl이 없거나 비어있을 경우 기본 아이콘(PersonIcon)을 사용합니다.
  const profileImage = feedback.authorProfileImageUrl || PersonIcon;
  const nickname = feedback.authorNickname || '알 수 없는 사용자';

  return (
    <div className="border-b border-gray-200 py-6 last:border-b-0">
      <div className="flex items-center mb-4">
        <img
          src={profileImage}
          alt="profile"
          className="w-12 h-12 rounded-full mr-4 bg-gray-100 object-cover"
        />
        <div>
          <p className="font-semibold text-gray-800">{nickname}</p>
          <p className="text-sm text-gray-500">
            {new Date(feedback.createdAt).toLocaleDateString('ko-KR')}
          </p>
        </div>
      </div>

      {imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {imageUrls.map((imgSrc, imgIndex) => (
            <div key={imgIndex} className="w-28 h-28 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={imgSrc}
                alt={`피드백 이미지 ${imgIndex + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{displayText}</p>
      
      {needsTruncation && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 mt-2 hover:underline"
        >
          {isExpanded ? '...접기' : '...더보기'}
        </button>
      )}
    </div>
  );
};

export default FeedbackItem;