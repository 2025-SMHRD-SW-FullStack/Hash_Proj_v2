import React from 'react';
import useAuthStore from '../../stores/authStore';

// [추가] 날짜 포맷팅을 위한 유틸리티 함수
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // '2023. 9. 5.' 형식으로 변환
  return date.toLocaleDateString('ko-KR');
};

const FeedbackItem = ({ feedback, onFeedbackDeleted }) => {
  const { user, isAdmin } = useAuthStore();
  const isAuthor = user?.id === feedback.userId;

 const optionsText = feedback.optionName;
 
  const handleDelete = async () => {
    // 여기에 삭제 로직이 필요하다면 추가할 수 있습니다.
    // 예: await deleteFeedback(feedback.id);
    // onFeedbackDeleted(feedback.id);
  };

  return (
    <div className="border-t border-gray-200 py-6">
      <div className="flex items-start space-x-4">
        {/* 작성자 프로필 이미지 */}
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          <img 
            src={feedback.authorProfileImageUrl || `https://ui-avatars.com/api/?name=${feedback.authorNickname}&background=random`} 
            alt={feedback.authorNickname}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{feedback.authorNickname}</p>
              <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                {optionsText && (
                  <>
                    <span className="whitespace-pre-wrap">{optionsText}</span>
                    <span>·</span>
                  </>
                )}
                <span>{formatDate(feedback.createdAt)}</span>
              </div>
            </div>
            {(isAuthor || isAdmin) && (
              <button onClick={handleDelete} className="text-xs text-gray-400 hover:text-red-500">
                삭제
              </button>
            )}
          </div>
          
          {/* 피드백 내용 */}
          <p className="mt-3 text-gray-700 whitespace-pre-wrap">{feedback.content}</p>

          {/* 피드백 이미지 (있을 경우) */}
          {feedback.imagesJson && JSON.parse(feedback.imagesJson).length > 0 && (
            <div className="mt-3 flex space-x-2">
              {JSON.parse(feedback.imagesJson).map((imgUrl, index) => (
                <div key={index} className="w-24 h-24 rounded-md overflow-hidden">
                  <img src={imgUrl} alt={`feedback image ${index + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackItem;