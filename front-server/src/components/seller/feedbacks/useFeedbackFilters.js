// src/components/seller/feedbacks/useFeedbackFilters.js
import { useMemo } from 'react';
// ✅ FEEDBACK_FILTERS와 TAB_KEYS를 모두 import 합니다.
import { FEEDBACK_FILTERS, TAB_KEYS } from '../../../../src/constants/sellerfeedbacks';
import { computeFeedbackState as classify} from '../../../util/FeedbacksStatus';

export default function useFeedbackFilters(rows = [], statusKey = TAB_KEYS.ALL) {
  const counts = useMemo(() => {
    const c = Object.fromEntries(Object.keys(TAB_KEYS).map(k => [k, 0]));
    c.ALL = rows.length;

    rows.forEach((r) => {
      const k = classify(r).key;
      if (k in c) {
        c[k]++;
      }
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (statusKey === TAB_KEYS.ALL) return rows;
    return rows.filter((r) => {
      const k = classify(r).key;
      return statusKey === k;
    });
  }, [rows, statusKey]);

  return { counts, filtered };
}