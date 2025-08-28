// 셀러 피드백 탭 키 상수, 신규 기준 시간, 공용 UI 토큰/컬럼폭

export const TAB_KEYS = {
  ALL: 'ALL',
  NEW: 'NEW',                 // 신규 작성
  WAIT: 'WAIT',               // 작성대기
  EXPIRED: 'EXPIRED',         // 기간만료
  REPORT_PENDING: 'REPORT_PENDING',
  REPORT_APPROVED: 'REPORT_APPROVED',
  REPORT_REJECTED: 'REPORT_REJECTED',
  EXCHANGE: 'EXCHANGE',       // 교환처리중
}

// 최근 작성(신규) 간주 기준 시간(시간)
export const NEW_THRESHOLD_HOURS = 24

// UI tokens (주문관리 톤과 맞춤)
export const UI = {
  box: 'rounded-xl border bg-white p-4 shadow-sm',
  pill: 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium',
  COLS: {
    ORDER: 'w-[140px] min-w-[140px]',
    PRODUCT: 'min-w-[220px] flex-1',
    BUYER: 'w-[120px] min-w-[120px]',
    DATE: 'w-[120px] min-w-[120px]',
    STATUS: 'w-[120px] min-w-[120px]',
    CONTENT: 'w-[320px] min-w-[280px]',
    ACTION: 'w-[96px] min-w-[96px]',
  },
}
