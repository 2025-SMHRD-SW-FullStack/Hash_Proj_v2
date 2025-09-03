import React, { useMemo, useState } from 'react';
import PersonIcon from '../../assets/icons/ic_person.svg';
import useAuthStore from '../../stores/authStore'; // useAuthStore 추가
import { adminDeleteFeedback } from '../../service/feedbackService'; // adminDeleteFeedback 추가
import Button from '../common/Button'; // Button 컴포넌트 추가

const FeedbackItem = ({ feedback, onFeedbackDeleted }) => { // onFeedbackDeleted 콜백 추가
  const [isExpanded, setIsExpanded] = useState(false);
  const { isAdmin } = useAuthStore(); // isAdmin 상태 가져오기

  const imageUrls = useMemo(() => {
    try {
      return JSON.parse(feedback.imagesJson || '[]');
    } catch {
      return [];
    }
  }, [feedback.imagesJson]);

  const needsTruncation = feedback.content.length > 150;
  const displayText = isExpanded ? feedback.content : `${feedback.content.slice(0, 150)}${needsTruncation ? '...' : ''}`;

  const profileImage = feedback.authorProfileImageUrl || PersonIcon;
  const nickname = feedback.authorNickname || '알 수 없는 사용자';

  const handleDelete = async (e) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    if (window.confirm('이 피드백을 정말 삭제하시겠습니까? 복구할 수 없습니다.')) {
      try {
        await adminDeleteFeedback(feedback.id);
        alert('피드백이 삭제되었습니다.');
        onFeedbackDeleted?.(feedback.id); // 부모 컴포넌트에 알림
      } catch (error) {
        alert('피드백 삭제에 실패했습니다.');
        console.error(error);
      }
    }
  };


  return (
    <div className="border-b border-gray-200 py-6 last:border-b-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
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
        {isAdmin && (
            <Button onClick={handleDelete} variant="danger" size="sm">
                삭제
            </Button>
        )}
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