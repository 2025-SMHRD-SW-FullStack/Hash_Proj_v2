import React, { useEffect, useState } from 'react';
import { getMyFeedbacks } from '../../../../service/feedbackService';
import MyFeedbackCard from './MyFeedbackCard';

const MyFeedbackHistoryPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
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
      <h1 className="hidden md:block text-lg md:text-xl font-bold mb-4 text-gray-800">작성한 피드백</h1>
      {feedbacks.length === 0 ? (
        <div className="border rounded-lg p-4 h-60 flex items-center justify-center text-gray-400">
          작성한 피드백이 없습니다.
        </div>
      ) : (
        <div
          className="
            grid gap-3
            grid-cols-3       /* 모바일도 기본 3개 */
            sm:grid-cols-3    /* 작은 화면 3개 */
            md:grid-cols-4    /* 중간 화면 4개 */
            lg:grid-cols-5    /* 큰 화면 5개 */
            xl:grid-cols-6    /* 초대형 화면 6개 */
          "
        >
          {feedbacks.map((fb) => (
            <MyFeedbackCard key={fb.id} feedback={fb} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyFeedbackHistoryPage;
