import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getFeedbackDetail,
  getSurveyTemplate,
  getPreSurveyByOrderItem, // ⬅ 추가
} from '../../../../service/feedbackService';
import Button from '../../../../components/common/Button';

// 별점 표시 컴포넌트
const StarRating = ({ score = 0 }) => (
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
  const [resolvedScores, setResolvedScores] = useState({});  // ⬅ 병합된 설문
  const [resolvedOverall, setResolvedOverall] = useState(0); // ⬅ 병합된 총점
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const safeParse = (json, fallback) => {
    try {
      if (!json) return fallback;
      const v = JSON.parse(json);
      return typeof v === 'object' && v !== null ? v : fallback;
    } catch { return fallback; }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) 상세
        const fb = await getFeedbackDetail(feedbackId);
        setFeedback(fb);

        // 2) 템플릿
        if (fb?.productId) {
          const tpl = await getSurveyTemplate(fb.productId);
          setSurveyTemplate(tpl);
        }

        // 3) 설문/총점 병합
        const scoresFromFb = safeParse(fb?.scoresJson, {});
        let mergedScores = scoresFromFb;
        let mergedOverall = Number(fb?.overallScore || 0) || 0;

        if (Object.keys(scoresFromFb).length === 0 && fb?.orderItemId) {
          // ⬇ 폴백: 프리설문 가져와 병합
          try {
            const pre = await getPreSurveyByOrderItem(fb.orderItemId);
            const answers = safeParse(pre?.answersJson, {});
            if (Object.keys(answers).length > 0) mergedScores = answers;
            if (!mergedOverall && Number(pre?.overallScore || 0) > 0) {
              mergedOverall = Number(pre.overallScore);
            }
          } catch (e) {
            console.warn('pre-survey fetch failed', e);
          }
        }

        setResolvedScores(mergedScores);
        setResolvedOverall(mergedOverall);
      } catch (e) {
        console.error(e);
        setError('피드백 상세 정보를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [feedbackId]);

  const imageUrls = useMemo(
    () => safeParse(feedback?.imagesJson, []),
    [feedback]
  );

  const getAnswerDisplayValue = (question, answerValue) => {
    if (answerValue === undefined || answerValue === null) return '';
    if (question.type === 'SCALE_1_5') {
      const labels = { 1: '매우 불만족', 2: '불만족', 3: '보통', 4: '만족', 5: '매우 만족' };
      const v = Number(answerValue);
      return `${v} (${labels[v] || ''})`;
    }
    if (question.type === 'CHOICE_ONE') {
      const val = String(answerValue);
      const opt = (question.options || []).find(o => String(o.value) === val);
      return opt?.label || val;
    }
    return String(answerValue);
  };

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!feedback) return <div>피드백 정보를 찾을 수 없습니다.</div>;

  const hasAnswers = surveyTemplate && Object.keys(resolvedScores).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b">
        <h1 className="hidden sm:block text-xl font-bold text-gray-800">피드백 상세 보기</h1>
         <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          목록으로
        </Button>
      </div>

      {/* 기본 정보 */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className='flex flex-col'>
          <span className='font-bold text-lg mb-2'>구매 상품 정보</span>
          <span className="font-bold text-lg mb-2 text-gray-700">{feedback.productName}</span>
          {feedback.optionName ?? <span className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">{feedback.optionName}</span>}
        </div>
        <div className="flex items-center gap-2 mt-2 pb-2 border-b">
          <span className="text-gray-700 font-semibold">총점</span>
          <StarRating score={resolvedOverall || 0} />
        </div>
      </div>

      {/* 상세 설문 */}
      {hasAnswers && (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <span className="font-bold text-lg mb-4 pb-2 border-b">상세 응답</span>
          <div className="space-y-4">
            {surveyTemplate.questions.map((q) => {
              const userAnswer = resolvedScores[q.code];
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

      {/* 작성 본문/사진 */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <span className="hidden md:block text-xl font-semibold ">작성한 피드백</span>
        <p className="whitespace-pre-wrap p-4 bg-gray-50 rounded-md min-h-[100px]">{feedback.content}</p>

        {imageUrls.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">등록한 사진</h4>
            <div className="flex flex-wrap gap-4">
              {imageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`피드백 이미지 ${i + 1}`}
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
