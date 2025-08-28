import { useEffect, useState } from "react";

const SurveyPage = ({ category }) => {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    // 실제로는 API 호출해서 카테고리별 질문 가져오기
    fetch(`/api/survey/${category}`)
      .then((res) => res.json())
      .then((data) => setQuestions(data.questions));
  }, [category]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // 설문 응답 수집
    const formData = new FormData(e.target);
    const answers = Object.fromEntries(formData.entries());
    console.log("응답:", answers);

    // 서버로 저장 API 호출
    fetch(`/api/survey/${category}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">{category} 피드백 설문</h2>

      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <label className="block font-medium">{q.label}</label>
          {q.type === "rating" && (
            <div className="flex gap-3">
              {q.options.map((opt) => (
                <label key={opt} className="flex flex-col items-center">
                  <input type="radio" name={q.id} value={opt} required={q.required} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}
          {q.type === "select" && (
            <select name={q.id} required={q.required} className="border rounded p-2">
              {q.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
          {q.type === "yesno" && (
            <div className="flex gap-3">
              {q.options.map((opt) => (
                <label key={opt}>
                  <input type="radio" name={q.id} value={opt} required={q.required} />
                  {opt}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      <button type="submit" className="bg-blue-500 text-white rounded px-4 py-2">
        제출하기
      </button>
    </form>
  );
};

export default SurveyPage;
