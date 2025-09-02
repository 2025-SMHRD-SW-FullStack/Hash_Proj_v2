import React, { useEffect, useState } from 'react';
import { getMyFeedbacks } from '../../../../service/feedbackService';
import FeedbackCard from './FeedbackCard';

const MyFeedbackHistoryPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        // 2. getMyFeedbacks는 Page 객체를 반환하므로 .content로 실제 목록에 접근
        const response = await getMyFeedbacks();
        setFeedbacks(response.content || []); 
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
          {/* 3. 분리된 컴포넌트 사용 */}
          {feedbacks.map(fb => <FeedbackCard key={fb.id} feedback={fb} />)}
        </div>
      )}
    </div>
  );
};

export default MyFeedbackHistoryPage;