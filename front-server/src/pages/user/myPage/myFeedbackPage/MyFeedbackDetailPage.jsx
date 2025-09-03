import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFeedbackDetail, getSurveyTemplate } from '../../../../service/feedbackService'; 
import Button from '../../../../components/common/Button';

// 별점 표시 컴포넌트
const StarRating = ({ score }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        className={`w-5 h-5 ${star <= score ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
    <span className="text-sm text-gray-600 ml-1">({score}/5)</span>
  </div>
);

const MyFeedbackDetailPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);
  const [surveyTemplate, setSurveyTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const feedbackData = await getFeedbackDetail(feedbackId);
        setFeedback(feedbackData);

        if (feedbackData?.productId) {
          const templateData = await getSurveyTemplate(feedbackData.productId);
          setSurveyTemplate(templateData);
        }
      } catch (err) {
        setError('피드백 상세 정보를 불러오는 데 실패했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [feedbackId]);
  
  const surveyScores = useMemo(() => feedback?.scoresJson ? JSON.parse(feedback.scoresJson) : {}, [feedback]);
  const imageUrls = useMemo(() => feedback?.imagesJson ? JSON.parse(feedback.imagesJson) : [], [feedback]);

  const getAnswerDisplayValue = (question, answerValue) => {
    if (question.type === 'SCALE_1_5') {
        const labels = { 1: '매우 불만족', 2: '불만족', 3: '보통', 4: '만족', 5: '매우 만족' };
        return `${answerValue} (${labels[answerValue] || ''})`;
    }
    if (question.type === 'CHOICE_ONE') {
        const option = question.options?.find(opt => opt.value === answerValue);
        return option?.label || answerValue;
    }
    return answerValue;
  };

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!feedback) return <div>피드백 정보를 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b">
        <h2 className="text-2xl font-bold">피드백 상세 보기</h2>
         <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          목록으로
        </Button>
      </div>

      {/* --- 기본 정보 --- */}
       <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h3 className="font-bold text-lg mb-2">{feedback.productName}</h3>
        <p className="text-sm text-gray-500 mb-4">{feedback.optionName}</p>
        <div className="flex items-center gap-2 mt-2 pb-2 border-b">
            <span className='font-semibold'>총점</span>
            <StarRating score={feedback.overallScore} />
        </div>
      </div>

      {/* --- 상세 설문 결과 --- */}
      {surveyTemplate && Object.keys(surveyScores).length > 0 && (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h3 className="font-bold text-lg mb-4 pb-2 border-b">상세 응답</h3>
          <div className="space-y-4">
            {surveyTemplate.questions.map(q => {
              const userAnswer = surveyScores[q.code];
              if (userAnswer === undefined || userAnswer === null) return null;

              return (
                <div key={q.code} className="flex items-center flex-row gap-4 text-sm">
                  <strong className="w-32 text-left text-gray-700">{q.label}</strong>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {getAnswerDisplayValue(q, userAnswer)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 작성 내용 및 사진 --- */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h3 className="font-bold text-lg mb-4 pb-2 border-b">작성한 피드백</h3>
        <p className="whitespace-pre-wrap p-4 bg-gray-50 rounded-md min-h-[100px]">{feedback.content}</p>

        {imageUrls.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">등록한 사진</h4>
            <div className="flex flex-wrap gap-4">
              {imageUrls.map((url, index) => (
                <img
                  key={index} src={url} alt={`피드백 이미지 ${index + 1}`}
                  className="w-40 h-40 rounded-lg object-cover hover:scale-105 transition-transform shadow-sm"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyFeedbackDetailPage;