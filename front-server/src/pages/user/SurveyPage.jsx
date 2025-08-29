import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSurveyTemplate } from "../../service/feedbackService";
import FeedbackChoiceModal from "../../components/feedback/FeedbackChoiceModal";
import Button from "../../components/common/Button";

// 별점 아이콘 SVG (이전과 동일)
const StarIcon = ({ filled, onClick, onMouseEnter, onMouseLeave }) => (
  <svg
    onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
    className={`w-10 h-10 cursor-pointer transition-transform duration-200 hover:scale-110 ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
    fill="currentColor" viewBox="0 0 20 20"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

export default function SurveyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderItemId = searchParams.get("orderItemId");
  const productId = searchParams.get("productId");

  // ✅ 1. sessionStorage에서 이전에 저장된 값을 불러오도록 초기 상태를 수정합니다.
  const [template, setTemplate] = useState(null);
  const [answers, setAnswers] = useState(() => {
    const saved = sessionStorage.getItem(`survey-answers-${orderItemId}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [overallScore, setOverallScore] = useState(() => {
    const saved = sessionStorage.getItem(`survey-score-${orderItemId}`);
    return saved ? Number(saved) : 0;
  });

  const [hoverScore, setHoverScore] = useState(0);
  const [openChoice, setOpenChoice] = useState(false);

  // ✅ 2. 답변이나 별점이 변경될 때마다 sessionStorage에 저장하는 로직을 추가합니다.
  useEffect(() => {
    sessionStorage.setItem(`survey-answers-${orderItemId}`, JSON.stringify(answers));
  }, [answers, orderItemId]);

  useEffect(() => {
    sessionStorage.setItem(`survey-score-${orderItemId}`, String(overallScore));
  }, [overallScore, orderItemId]);

  useEffect(() => {
    if (!productId) return;
    (async () => {
      try {
        const tpl = await getSurveyTemplate(productId);
        setTemplate(tpl);
      } catch (e) {
        console.error("설문 템플릿 로딩 실패:", e);
        alert("설문지를 불러오는 중 오류가 발생했습니다.");
        navigate(-1);
      }
    })();
  }, [productId, navigate]);

  // ✅ 페이지 진입(뒤로가기 포함) 시 sessionStorage에서 값 복원
  useEffect(() => {
    const savedAnswers = sessionStorage.getItem(`survey-answers-${orderItemId}`);
    const savedScore = sessionStorage.getItem(`survey-score-${orderItemId}`);

    if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
    if (savedScore) setOverallScore(Number(savedScore));
  }, [orderItemId]);


  const handleAnswerChange = (questionCode, value) => {
    setAnswers(prev => ({ ...prev, [questionCode]: value }));
  };

  const handleSubmit = () => {
    if (overallScore === 0) {
      alert("상품의 총점을 매겨주세요.");
      return;
    }
    // 제출 시에는 임시 저장했던 데이터를 삭제해줍니다.
    // sessionStorage.removeItem(`survey-answers-${orderItemId}`);
    // sessionStorage.removeItem(`survey-score-${orderItemId}`);
    setOpenChoice(true);
  };

  if (!template) return <div className="p-6">설문지를 불러오는 중…</div>;

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">상품 피드백 설문</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">상품의 총점을 매겨주세요.</h2>
        <div className="flex justify-center" onMouseLeave={() => setHoverScore(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon key={star} filled={star <= (hoverScore || overallScore)} onClick={() => setOverallScore(star)} onMouseEnter={() => setHoverScore(star)} />
          ))}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-6">항목별 상세 평가</h2>
        <div className="space-y-6">
          {(template.questions ?? []).map((q) => (
            <div key={q.code}>
              <h3 className="font-medium text-gray-800 mb-3">{q.label}</h3>
              <div className="flex flex-wrap gap-2">
                {q.type === "SCALE_1_5" && (
                  [1, 2, 3, 4, 5].map(value => (
                    <Button key={value} variant={answers[q.code] === value ? 'primary' : 'unselected'} onClick={() => handleAnswerChange(q.code, value)} className="flex-grow sm:flex-grow-0">
                      {value}
                    </Button>
                  ))
                )}
                {q.type === "CHOICE_ONE" && (q.options ?? []).map((opt) => (
                  <Button key={opt.value} variant={answers[q.code] === opt.value ? 'primary' : 'unselected'} onClick={() => handleAnswerChange(q.code, opt.value)} className="flex-grow sm:flex-grow-0">
                    {opt.label}
                  </Button>
                ))}
                {q.allowNa && (
                    <Button variant={answers[q.code] === 'NA' ? 'primary' : 'unselected'} onClick={() => handleAnswerChange(q.code, 'NA')} className="flex-grow sm:flex-grow-0">
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
        onClose={() => setOpenChoice(false)}
        onPickManual={() => navigate(`/user/feedback/editor?orderItemId=${orderItemId}&type=MANUAL&overallScore=${overallScore}&scoresJson=${encodeURIComponent(JSON.stringify(answers))}`)}
        onPickAI={() => navigate(`/user/feedback/editor?orderItemId=${orderItemId}&type=AI&overallScore=${overallScore}&scoresJson=${encodeURIComponent(JSON.stringify(answers))}`)}
      />
    </div>
  );
}