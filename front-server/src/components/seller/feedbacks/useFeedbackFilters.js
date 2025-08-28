import { useMemo } from 'react'
import { TAB_KEYS } from '/src/constants/sellerfeedbacks'
import { classify } from '/src/util/feedbacksStatus'

export default function useFeedbackFilters(rows = [], statusKey = TAB_KEYS.ALL) {
  const counts = useMemo(() => {
    const c = {
      [TAB_KEYS.ALL]: rows.length,
      [TAB_KEYS.NEW]: 0,
      [TAB_KEYS.WAIT]: 0,
      [TAB_KEYS.EXPIRED]: 0,
      [TAB_KEYS.REPORT_PENDING]: 0,
      [TAB_KEYS.REPORT_APPROVED]: 0,
      [TAB_KEYS.REPORT_REJECTED]: 0,
      [TAB_KEYS.EXCHANGE]: 0,
    }
    rows.forEach((r) => {
      const k = classify(r)
      if (k in c) c[k]++
    })
    return c
  }, [rows])

  const filtered = useMemo(() => {
    if (statusKey === TAB_KEYS.ALL) return rows
    return rows.filter((r) => {
      const k = classify(r)
      return statusKey === TAB_KEYS.NEW ? k === TAB_KEYS.NEW : k === statusKey
    })
  }, [rows, statusKey])

  return { counts, filtered }
}
