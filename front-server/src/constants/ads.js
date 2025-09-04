// /src/constants/ads.js

// 백엔드의 광고 슬롯 enum과 일치
export const AD_SLOT_TYPES = {
  MAIN_ROLLING: 'MAIN_ROLLING',
  MAIN_SIDE: 'MAIN_SIDE',
  CATEGORY_TOP: 'CATEGORY_TOP',
  ORDER_COMPLETE: 'ORDER_COMPLETE',
}

// ✅ 광고 상태: 백엔드 enum 그대로 사용
export const AD_STATUS = {
  RESERVED_UNPAID: 'RESERVED_UNPAID',  // 예약-미결제
  RESERVED_PAID: 'RESERVED_PAID',      // 예약-결제완료
  ACTIVE: 'ACTIVE',                    // 활성
  COMPLETED: 'COMPLETED',              // 완료
  CANCELLED: 'CANCELLED',              // 취소됨
}

// (선택) 화면 표시용 한글 라벨/색상 - 페이지에서 import해서 사용
export const AD_STATUS_LABEL = {
  [AD_STATUS.RESERVED_UNPAID]: '대기중(미결제)',
  [AD_STATUS.RESERVED_PAID]: '대기중(결제완료)',
  [AD_STATUS.ACTIVE]: '활성',
  [AD_STATUS.COMPLETED]: '완료',
  [AD_STATUS.CANCELLED]: '취소됨',
}

export const AD_STATUS_COLOR = {
  [AD_STATUS.RESERVED_UNPAID]: 'bg-yellow-100 text-yellow-800',
  [AD_STATUS.RESERVED_PAID]: 'bg-amber-100 text-amber-800',
  [AD_STATUS.ACTIVE]: 'bg-green-100 text-green-800',
  [AD_STATUS.COMPLETED]: 'bg-blue-100 text-blue-800',
  [AD_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
}

// 이미지 업로드 타입 - 백엔드 ImageType enum과 일치
export const UPLOAD_TYPE = {
  AD: 'AD',
}
