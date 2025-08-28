import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSurveyTemplate, submitSurvey } from "../service/feedbackService";
import FeedbackChoiceModal from "../components/feedback/FeedbackChoiceModal";
import Button from "../components/common/Button";

// 별점 아이콘 SVG 컴포넌트
const StarIcon = ({ filled, onClick, onMouseEnter, onMouseLeave }) => (
  <svg
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className={`w-10 h-10 cursor-pointer transition-transform duration-200 hover:scale-110 ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

export default function SurveyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderItemId = searchParams.get("orderItemId");
  const productId = searchParams.get("productId");

  const [template, setTemplate] = useState(null);
  const [answers, setAnswers] = useState({});
  const [overallScore, setOverallScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [openChoice, setOpenChoice] = useState(false);

  // productId 기반으로 설문 템플릿 API 호출
  useEffect(() => {
    if (!productId) return;
    (async () => {
      try {
        const tpl = await getSurveyTemplate(productId);
        setTemplate(tpl);
      } catch (e) {
        console.error("설문 템플릿 로딩 실패:", e);
        alert("설문지를 불러오는 중 오류가 발생했습니다.");
        navigate(-1); // 이전 페이지로 이동
      }
    })();
  }, [productId, navigate]);

  const handleAnswerChange = (questionCode, value) => {
    setAnswers(prev => ({ ...prev, [questionCode]: value }));
  };

  const handleSubmit = async () => {
    if (overallScore === 0) {
      alert("상품의 총점을 매겨주세요.");
      return;
    }
    
    // 백엔드 API에는 전체 만족도 점수를 보내지 않으므로,
    // 설문 답변(answers)만 전송합니다.
    try {
      // answers 객체를 scoresJson 필드에 JSON 문자열 형태로 담아 전송
      await submitSurvey(Number(orderItemId), { scoresJson: JSON.stringify(answers) });
      setOpenChoice(true);
    } catch (e) {
      console.error("설문 제출 실패:", e);
      const errorMsg = e?.message || "설문 제출 중 오류가 발생했습니다.";
      alert(errorMsg);
    }
  };

  if (!template) return <div className="p-6">설문지를 불러오는 중…</div>;

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">상품 피드백 설문</h1>
      
      {/* 1. 전체 만족도 별점 */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">상품의 총점을 매겨주세요.</h2>
        <div className="flex justify-center" onMouseLeave={() => setHoverScore(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              filled={star <= (hoverScore || overallScore)}
              onClick={() => setOverallScore(star)}
              onMouseEnter={() => setHoverScore(star)}
            />
          ))}
        </div>
      </div>
      
      {/* 2. 항목별 질문 */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-6">항목별 상세 평가</h2>
        <div className="space-y-6">
          {(template.questions ?? []).map((q) => (
            <div key={q.code}>
              <h3 className="font-medium text-gray-800 mb-3">{q.label}</h3>
              <div className="flex flex-wrap gap-2">
                {/* 5점 척도 */}
                {q.type === "SCALE_1_5" && (
                  [1, 2, 3, 4, 5].map(value => (
                    <Button
                      key={value}
                      variant={answers[q.code] === value ? 'primary' : 'unselected'}
                      onClick={() => handleAnswerChange(q.code, value)}
                      className="flex-grow sm:flex-grow-0"
                    >
                      {value}
                    </Button>
                  ))
                )}
                {/* 선택형 */}
                {q.type === "CHOICE_ONE" && (q.options ?? []).map((opt) => (
                  <Button
                    key={opt.value}
                    variant={answers[q.code] === opt.value ? 'primary' : 'unselected'}
                    onClick={() => handleAnswerChange(q.code, opt.value)}
                    className="flex-grow sm:flex-grow-0"
                  >
                    {opt.label}
                  </Button>
                ))}
                {/* '해당없음' 옵션 */}
                {q.allowNa && (
                    <Button
                        variant={answers[q.code] === 'NA' ? 'primary' : 'unselected'}
                        onClick={() => handleAnswerChange(q.code, 'NA')}
                        className="flex-grow sm:flex-grow-0"
                    >
                        해당 없음
                    </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <Button size="lg" onClick={handleSubmit} className="w-full md:w-auto px-10 py-4 text-lg font-bold">
          제출하고 피드백 작성하기
        </Button>
      </div>

      <FeedbackChoiceModal
        open={openChoice}
        onClose={() => navigate('/user/mypage/orders')}
        // FeedbackEditor로 이동 시, 전체 만족도 점수(overallScore)와 설문답변(scoresJson)을 함께 넘겨줍니다.
        onPickManual={() => navigate(`/feedback/editor?orderItemId=${orderItemId}&type=MANUAL&overallScore=${overallScore}&scoresJson=${encodeURIComponent(JSON.stringify(answers))}`)}
        onPickAI={() => navigate(`/feedback/editor?orderItemId=${orderItemId}&type=AI&overallScore=${overallScore}&scoresJson=${encodeURIComponent(JSON.stringify(answers))}`)}
      />
    </div>
  );
}