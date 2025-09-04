import { useMemo } from "react";

const inputCls =
  "w-full h-28 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none";

const presets = [
  "문 앞에 놓아주세요.",
  "부재 시 경비실에 맡겨주세요.",
  "배송 전 연락 부탁드립니다.",
  "아이 자고 있어요. 초인종 누르지 말아주세요.",
];

export default function RequestMemoField({ value = "", onChange, maxLen = 200 }) {
  // 부모가 가진 value만을 단일 소스로 사용 (로컬 state 없음)
  const remain = useMemo(() => maxLen - (value?.length || 0), [value, maxLen]);

  const emit = (next) => {
    const clipped = (next || "").slice(0, maxLen);
    onChange?.(clipped);
  };

  const handleTextChange = (e) => emit(e.target.value);

  const addPreset = (txt) => {
    const base = (value || "").trim();
    const next = base ? `${base} ${txt}` : txt;
    emit(next);
  };

  return (
    <section className="mb-8 border-b pb-6">
      <h2 className="text-lg font-semibold mb-3">배송 요청사항</h2>

      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => addPreset(p)}
            className="px-3 h-9 rounded-full border text-sm hover:bg-gray-50"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="relative">
        <textarea
          value={value}
          onChange={handleTextChange}
          placeholder="예) 배송 전 연락 부탁드려요."
          className={inputCls}
          aria-label="배송 요청사항"
        />
        <div className="absolute bottom-2 right-3 text-xs text-gray-500">
          {remain} / {maxLen}
        </div>
      </div>
    </section>
  );
}
