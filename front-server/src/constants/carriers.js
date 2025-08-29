// 공통 택배사 목록 + 유틸
// - code: 우리 서비스 내부에서 쓰는 고정 코드 (영문 대문자/숏코드)
// - label: 화면용 표시 이름
// - aliases: 검색/자동감지용 별칭(한/영/약칭)
// - providerCodes: 나중에 실제 조회 API를 고르면 여기에 매핑만 채우면 됨


// 어떻게 확장하냐?
// 새 업체 추가: CARRIERS에 { code, label, aliases } 한 줄 추가.
// API 붙일 때: 사용하는 조회 API가 정해지면, 각 항목의 providerCodes에 해당 사업자 코드만 채워주면 끝.
// 예) providerCodes: { sweettracker: '04', aftership: 'kr-cj' } (값은 실제 스펙에 맞춰 입력)




export const CARRIERS = [
  { code: 'CJ',       label: 'CJ대한통운',           aliases: ['cj','cj대한통운','cj logistics','대한통운'], providerCodes: {} },
  { code: 'LOTTE',    label: '롯데택배',             aliases: ['lotte','롯데','롯데글로벌로지스'],          providerCodes: {} },
  { code: 'HANJIN',   label: '한진택배',             aliases: ['hanjin','한진'],                           providerCodes: {} },
  { code: 'LOGEN',    label: '로젠택배',             aliases: ['logen','로젠'],                           providerCodes: {} },
  { code: 'EPOST',    label: '우체국택배',           aliases: ['epost','우체국','koreapost','post'],       providerCodes: {} },
  { code: 'KD',       label: '경동택배',             aliases: ['kd','경동'],                               providerCodes: {} },

  // 국내 기타
  { code: 'DAESIN',   label: '대신택배',             aliases: ['daesin','대신'],                          providerCodes: {} },
  { code: 'ILYANG',   label: '일양로지스',           aliases: ['ilyang','일양'],                          providerCodes: {} },
  { code: 'CHUNIL',   label: '천일택배',             aliases: ['chunil','천일'],                          providerCodes: {} },
  { code: 'HAPDONG',  label: '합동택배',             aliases: ['hapdong','합동'],                        providerCodes: {} },
  { code: 'GEONYOUNG',label: '건영택배',             aliases: ['geonyoung','건영'],                      providerCodes: {} },
  { code: 'SEONGWON', label: '성원글로벌카고',       aliases: ['seongwon','성원글로벌'],                  providerCodes: {} },
  { code: 'SLX',      label: 'SLX택배',              aliases: ['slx'],                                    providerCodes: {} },
  { code: 'CVSNET',   label: 'CU편의점택배(CVSnet)', aliases: ['cvsnet','cu편의점','cu'],                providerCodes: {} },
  { code: 'GSPOST',   label: 'GS Postbox 택배',      aliases: ['gspostbox','gs25','gs편의점'],            providerCodes: {} },
  { code: 'YONGMA',   label: '용마로지스',           aliases: ['yongma','용마'],                          providerCodes: {} },
]

// 셀렉트용 옵션 (자동감지 없음)
export const carrierOptions = [...CARRIERS].sort((a, b) => a.label.localeCompare(b.label, 'ko'))

// 코드 → 라벨
export const carrierLabel = (code) =>
  CARRIERS.find(c => c.code === code)?.label || (code || '')

// 입력 텍스트(코드/라벨/별칭)로 캐리어 찾기
export const resolveCarrier = (input = '') => {
  const q = String(input).trim().toLowerCase()
  if (!q) return null
  return (
    CARRIERS.find(c =>
      c.code.toLowerCase() === q ||
      c.label.toLowerCase() === q ||
      (c.aliases || []).some(a => a.toLowerCase() === q)
    ) || null
  )
}

// 송장번호 정규화(숫자/영문/하이픈만)
export const normalizeTrackingNo = (s = '') => String(s).replace(/[^0-9A-Za-z-]/g, '')

// 서버 전송 페이로드(자동감지 없음 → 코드 필수로 쓰는 걸 권장)
export const toTrackingPayload = ({ carrierCode, trackingNo }) => ({
  carrier: carrierCode,                              // 빈 값이면 서버에서 에러 처리 권장
  trackingNo: normalizeTrackingNo(trackingNo || ''),
})
