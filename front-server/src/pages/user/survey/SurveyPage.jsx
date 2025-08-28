import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSurveyTemplate, submitSurvey } from "../../../service/feedbackService";
import FeedbackChoiceModal from "../../../components/feedback/FeedbackChoiceModal";

export default function SurveyPage() {
  const [sp] = useSearchParams();
  const orderItemId = sp.get("orderItemId");
  const category = sp.get("category") || "GENERAL";

  const [template, setTemplate] = useState(null);
  const [answers, setAnswers] = useState({});
  const [openChoice, setOpenChoice] = useState(false);
  const navi = useNavigate();

  useEffect(() => {
    (async () => {
      const t = await getSurveyTemplate(category);
      setTemplate(t);
    })();
  }, [category]);

  const onChange = (qid, value) => setAnswers(prev => ({ ...prev, [qid]: value }));

  const onSubmit = async () => {
    try {
      await submitSurvey(Number(orderItemId), { answers });
      setOpenChoice(true);
    } catch (e) {
      console.error(e);
      alert("설문 제출 중 오류가 발생했습니다.");
    }
  };

  if (!orderItemId) return <div className="p-6 text-red-500">orderItemId가 필요합니다.</div>;
  if (!template) return <div className="p-6">설문 불러오는 중…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">구매 후 설문</h1>

      <div className="space-y-4">
        {(template.questions ?? []).map((q) => (
          <div key={q.id} className="border rounded-2xl p-4">
            <div className="font-medium">
              {q.title || q.label}
              {q.required && <span className="text-red-500"> *</span>}
            </div>

            {q.type === "SCALE_1_5" && (
              <div className="mt-2 flex gap-2">
                {[1,2,3,4,5].map(v => (
                  <button
                    key={v}
                    className={`px-3 py-2 rounded border ${answers[q.id]===v?'bg-gray-900 text-white':'bg-white'}`}
                    onClick={() => onChange(q.id, v)}
                  >{v}</button>
                ))}
              </div>
            )}

            {q.type === "RADIO" && (
              <div className="mt-2 flex flex-wrap gap-3">
                {(q.choices ?? []).map(c => (
                  <label key={c.value} className="flex items-center gap-1">
                    <input type="radio" name={q.id} onChange={() => onChange(q.id, c.value)} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}

            {q.type === "CHECKBOX" && (
              <div className="mt-2 flex flex-wrap gap-3">
                {(q.choices ?? []).map(c => (
                  <label key={c.value} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        const arr = Array.isArray(answers[q.id]) ? [...answers[q.id]] : [];
                        if (e.target.checked) arr.push(c.value);
                        else arr.splice(arr.indexOf(c.value), 1);
                        onChange(q.id, arr);
                      }}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}

            {q.type === "TEXT" && (
              <textarea
                className="mt-2 w-full h-24 rounded-lg border p-2"
                onChange={(e) => onChange(q.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSubmit}
          className="h-10 px-4 rounded-lg bg-gray-900 text-white hover:opacity-90"
        >
          제출
        </button>
      </div>

      {openChoice && (
        <FeedbackChoiceModal
          open={openChoice}
          onClose={() => setOpenChoice(false)}
          onPickManual={() => navi(`/user/feedback/editor?orderItemId=${orderItemId}&type=MANUAL`)}
          onPickAI={() => navi(`/user/feedback/editor?orderItemId=${orderItemId}&type=AI`)}
        />
      )}
    </div>
  );
}
