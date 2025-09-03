// 백엔드의 광고 슬롯 enum과 일치하도록 정의
export const AD_SLOT_TYPES = {
  MAIN_ROLLING: 'MAIN_ROLLING',
  MAIN_SIDE: 'MAIN_SIDE',
  CATEGORY_TOP: 'CATEGORY_TOP',
  ORDER_COMPLETE: 'ORDER_COMPLETE',
}

// 광고 상태
export const AD_STATUS = {
  PENDING: 'PENDING',      // 대기중
  ACTIVE: 'ACTIVE',        // 활성
  PAUSED: 'PAUSED',        // 일시정지
  COMPLETED: 'COMPLETED',  // 완료
  CANCELLED: 'CANCELLED',  // 취소됨
}

// 이미지 업로드 타입
export const UPLOAD_TYPE = {
  AD_BANNER: 'AD_BANNER',
}
