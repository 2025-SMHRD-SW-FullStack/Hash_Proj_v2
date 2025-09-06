import { useMemo, useState } from "react";
import CategorySelect from "../common/CategorySelect";

const presets = [
  "문 앞에 놓아주세요.",
  "부재 시 경비실에 맡겨주세요.",
  "배송 전 연락 부탁드립니다.",
  "아이 자고 있어요. 초인종 누르지 말아주세요.",
  "직접 입력",
];

export default function RequestMemoField({ value = "", onChange, maxLen = 200, className }) {
  const [selected, setSelected] = useState({ label: "", value: "" });
  const remain = useMemo(() => maxLen - (value?.length || 0), [value, maxLen]);
  const isCustom = selected?.value === 'custom';

  const emit = (next) => {
    const clipped = (next || "").slice(0, maxLen);
    onChange?.(clipped);
  };

  const handleTextChange = (e) => emit(e.target.value);

  const handleSelect = (item) => {
    setSelected(item);
    if (item.value === "custom") {
      emit(""); // 직접 입력 모드
    } else {
      emit(item.label); // 선택 옵션 자동 입력
    }
  };


  return (
    <section className={`mb-6 border-b w-full ${className}`}>
      <h2 className="text-lg font-semibold mb-3">배송 요청사항</h2>

        <CategorySelect
          categories={presets.map(p =>
            p === "직접 입력" ? { label: p, value: "custom" } : { label: p, value: p }
          )}
          selected={selected}
          onChange={handleSelect}
        />

      {isCustom && (
      <textarea
        value={value}               
        onChange={handleTextChange}
        placeholder="예) 배송 전 연락 부탁드려요."
        className='w-full h-28 px-3 py-2 mt-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none'
      />
    )}
    </section>
  );
}
