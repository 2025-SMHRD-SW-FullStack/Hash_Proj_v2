// src/constants/sellerfeedbacks.js

// 피드백 관리 전용 상수/스타일

// 필터 키 (검토 계열 제거)
export const FEEDBACK_FILTERS = [
  { key: 'ALL',              label: '전체' },
  { key: 'NEW',              label: '신규 작성' },   // 오늘/최근 들어온 신규 작성 건(목업 기준 자유)
  { key: 'PENDING_WRITE',    label: '작성 대기' },
  { key: 'EXPIRED',          label: '기간 만료' },
  { key: 'REPORT_PENDING',   label: '신고 대기' },
  { key: 'REPORTED',         label: '신고 완료' },
  { key: 'REPORT_REJECTED',  label: '신고 거절' },
  { key: 'EXCHANGE',         label: '교환 처리중' },
]

// UI 토큰
export const UI = {
  // 상태 뱃지 공통(표 안에서 쓰는 Pill)
  pill: 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium',
};
