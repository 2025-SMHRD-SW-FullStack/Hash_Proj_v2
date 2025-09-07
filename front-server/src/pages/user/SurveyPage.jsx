import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSurveyTemplate, submitSurvey } from "../../service/feedbackService";
import { getMyOrderDetail } from "../../service/orderService";
import FeedbackChoiceModal from "../../components/feedback/FeedbackChoiceModal";
import Button from "../../components/common/Button";

const StarIcon = ({ filled, onClick, onMouseEnter, onMouseLeave }) => (
  <svg
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className={`w-10 h-10 cursor-pointer transition-transform duration-200 hover:scale-110 ${
      filled ? "text-yellow-400" : "text-gray-300"
    }`}
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

export default function SurveyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 쿼리 파라미터
  const orderItemIdQ = searchParams.get("orderItemId");
  const productIdQ = searchParams.get("productId");
  const orderIdQ = searchParams.get("orderId");

  // 다건 주문 대응: 선택 상태
  const [orderItems, setOrderItems] = useState([]);
  const [orderItemId, setOrderItemId] = useState(orderItemIdQ || "");
  const [productId, setProductId] = useState(productIdQ || "");

  // sessionStorage 키(선택/단일 모두 안전하게)
  const storageKeyBase = orderItemId || orderItemIdQ || (orderIdQ ? `order-${orderIdQ}` : "unknown");

  const [template, setTemplate] = useState(null);
  const [answers, setAnswers] = useState(() => {
    const saved = sessionStorage.getItem(`survey-answers-${storageKeyBase}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [overallScore, setOverallScore] = useState(() => {
    const saved = sessionStorage.getItem(`survey-score-${storageKeyBase}`);
    return saved ? Number(saved) : 0;
  });

  const [hoverScore, setHoverScore] = useState(0);
  const [openChoice, setOpenChoice] = useState(false);
  const scaleLabels = { 1: '매우 불만족', 2: '불만족', 3: '보통', 4: '만족', 5: '매우 만족' };

  // 다건 주문이면 주문 상세 로딩 후 선택옵션 구성
  useEffect(() => {
    if (!orderIdQ) return;
    (async () => {
      try {
        const detail = await getMyOrderDetail(orderIdQ);
        const items = (detail?.items ?? []).map(it => {
          let optText = "기본";
          try {
            const opt = JSON.parse(it.optionSnapshotJson || "{}");
            const vals = Object.values(opt).filter(Boolean);
            if (vals.length) optText = vals.join(" / ");
          } catch {}
          return {
            value: String(it.id),
            label: `${it.productName} (${optText})`,
            productId: String(it.productId),
          };
        });
        setOrderItems(items);
        // 초기 선택(없으면 첫 번째)
        if (!orderItemId && items[0]) {
          setOrderItemId(items[0].value);
          setProductId(items[0].productId);
        }
      } catch (e) {
        console.error(e);
        alert("주문 정보를 불러오지 못했습니다.");
        navigate(-1);
      }
    })();
  }, [orderIdQ, orderItemId, navigate]);

  // 템플릿 로딩
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

  // 답안/점수 저장
  useEffect(() => {
    sessionStorage.setItem(`survey-answers-${storageKeyBase}`, JSON.stringify(answers));
  }, [answers, storageKeyBase]);
  useEffect(() => {
    sessionStorage.setItem(`survey-score-${storageKeyBase}`, String(overallScore));
  }, [overallScore, storageKeyBase]);

  // 복원
  useEffect(() => {
    const savedAnswers = sessionStorage.getItem(`survey-answers-${storageKeyBase}`);
    const savedScore = sessionStorage.getItem(`survey-score-${storageKeyBase}`);
    if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
    if (savedScore) setOverallScore(Number(savedScore));
  }, [storageKeyBase]);

  const handleAnswerChange = (questionCode, value) => {
    setAnswers((prev) => ({ ...prev, [questionCode]: value }));
  };

  const handleSubmit = async () => {
    const effOrderItemId = Number(orderItemId || orderItemIdQ);
    const effProductId = Number(productId || productIdQ);

    if (!effOrderItemId || !effProductId) {
      alert("평가할 상품을 선택해주세요.");
      return;
    }
    if (overallScore === 0) {
      alert("상품의 총점을 매겨주세요.");
      return;
    }
    try {
      await submitSurvey(effOrderItemId, {
        productId: effProductId,
        overallScore,
        answers,
      });
    } catch (e) {
      console.error("설문 저장 실패:", e);
      alert("설문 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setOpenChoice(true);
    }
  };

  if (!template) return <div className="p-6">설문지를 불러오는 중…</div>;

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">상품 피드백 설문</h1>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">상품의 총점을 매겨주세요.</h2>
          {!!orderIdQ && (
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={orderItemId || ""}
              onChange={(e) => {
                const v = e.target.value;
                setOrderItemId(v);
                const found = orderItems.find(i => i.value === v);
                setProductId(found?.productId || "");
              }}
            >
              <option value="" disabled>상품 선택</option>
              {orderItems.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
        </div>

        <div
          className="flex justify-center"
          onMouseLeave={() => setHoverScore(0)}
        >
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

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-6">항목별 상세 평가</h2>
        <div className="space-y-6">
          {(template.questions ?? []).filter(q => q.code !== 'overall').map((q) => (
            <div key={q.code}>
              <h3 className="font-medium text-gray-800 mb-3">{q.label}</h3>
              <div className="flex flex-wrap gap-2">
                {q.type === "SCALE_1_5" &&
                  [1, 2, 3, 4, 5].map((value) => (
                    <Button
                      key={value}
                      variant={answers[q.code] === value ? "primary" : "unselected"}
                      onClick={() => handleAnswerChange(q.code, value)}
                      className="flex-grow sm:flex-grow-0"
                    >
                      {`${value} (${scaleLabels[value]})`}
                    </Button>
                  ))}
                {q.type === "CHOICE_ONE" &&
                  (q.options ?? []).map((opt) => (
                    <Button
                      key={opt.value}
                      variant={answers[q.code] === opt.value ? "primary" : "unselected"}
                      onClick={() => handleAnswerChange(q.code, opt.value)}
                      className="flex-grow sm:flex-grow-0"
                    >
                      {opt.label}
                    </Button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          onClick={handleSubmit}
          className="w-full md:w-auto px-10 py-4 text-lg font-bold"
        >
          제출하고 피드백 작성하기
        </Button>
      </div>

      <FeedbackChoiceModal
        open={openChoice}
        onClose={() => setOpenChoice(false)}
        onPickManual={() =>
          navigate(
            `/user/feedback/editor?orderItemId=${orderItemId || orderItemIdQ}&productId=${productId || productIdQ}&type=MANUAL&overallScore=${overallScore}&scoresJson=${encodeURIComponent(
              JSON.stringify(answers)
            )}`
          )
        }
        onPickAI={() =>
          navigate(
            `/user/feedback/editor?orderItemId=${orderItemId || orderItemIdQ}&productId=${productId || productIdQ}&type=AI&overallScore=${overallScore}&scoresJson=${encodeURIComponent(
              JSON.stringify(answers)
            )}`
          )
        }
      />
    </div>
  );
}
