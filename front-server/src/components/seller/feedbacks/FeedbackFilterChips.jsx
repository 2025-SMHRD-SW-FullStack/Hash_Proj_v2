// src/components/seller/feedbacks/FeedbackFilterChips.jsx

import React from 'react';
import StatusChips from '/src/components/seller/StatusChips';
import { FEEDBACK_FILTERS } from '/src/constants/sellerfeedbacks';

export default function FeedbackFilterChips({ counts, value, onChange }) {
  // ✅ FEEDBACK_FILTERS 배열을 map으로 순회하여 items를 동적으로 생성합니다.
  // 이렇게 하면 key 값이 항상 고유하고 정확하게 보장됩니다.
  const items = FEEDBACK_FILTERS.map(filter => {
    const count = counts[filter.key];
    const showCount = count > 0 && filter.key !== 'ALL';

    return {
      key: filter.key, // FEEDBACK_FILTERS의 key를 직접 사용
      label: showCount ? `${filter.baseLabel}` : filter.baseLabel,
      count: count,
    };
  });

  return (
    <StatusChips
      items={items}
      value={value}
      onChange={onChange}
      size="sm"
      variant="admin"
    />
  );
}