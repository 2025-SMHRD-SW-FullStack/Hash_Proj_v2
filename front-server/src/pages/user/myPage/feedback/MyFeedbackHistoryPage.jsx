import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TestImg from '../../../../assets/images/ReSsol_TestImg.png'; // 임시 이미지
import { getMyFeedbacks } from '../../../../service/feedbackService';

// 개별 피드백 카드를 표시하는 컴포넌트
const FeedbackCard = ({ feedback }) => {
  const navigate = useNavigate();
  // imagesJson이 null이거나 파싱 불가능한 경우를 대비하여 안전하게 처리
  const imageUrls = useMemo(() => {
    try {
      return JSON.parse(feedback.imagesJson || '[]');
    } catch {
      return [];
    }
  }, [feedback.imagesJson]);

  return (
    <div 
      className="border rounded-lg p-4 mb-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/user/mypage/feedback/${feedback.id}`)}
    >
      <div className="flex items-start gap-4">
        <img 
          src={imageUrls[0] || TestImg} 
          alt={feedback.productName} 
          className="w-24 h-24 rounded-md object-cover"
        />
        <div className="flex-grow">
          <p className="text-sm text-gray-500">{new Date(feedback.createdAt).toLocaleDateString('ko-KR')}</p>
          <p className="font-semibold my-1">{feedback.productName}</p>
          <p className="text-gray-700 text-sm line-clamp-2">{feedback.content}</p>
        </div>
      </div>
    </div>
  );
};


const MyFeedbackHistoryPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        const data = await getMyFeedbacks();
        setFeedbacks(data || []); // API 응답이 null일 경우 빈 배열로 초기화
      } catch (err) {
        setError('작성한 피드백을 불러오는 데 실패했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, []);

  if (loading) return <div className="text-center p-10">피드백 목록을 불러오는 중...</div>;
  if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">작성한 피드백</h2>
      {feedbacks.length === 0 ? (
        <div className="border rounded-lg p-4 h-60 flex items-center justify-center text-gray-400">
          작성한 피드백이 없습니다.
        </div>
      ) : (
        <div>
          {feedbacks.map(fb => <FeedbackCard key={fb.id} feedback={fb} />)}
        </div>
      )}
    </div>
  );
};

export default MyFeedbackHistoryPage;