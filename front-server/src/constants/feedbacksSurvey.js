// 설문 스키마: 공통 + 카테고리별
export const COMMON_QUESTIONS = [
  { key: 'overall', label: '전체 만족도', type: 'star' },          // 1~5
  { key: 'price', label: '가격 만족도', type: 'star' },            // 1~5
  { key: 'nps', label: '추천 의향(NPS)', type: 'star' },           // 1~5
];

export const SURVEY_BY_CATEGORY = {
  '전자제품': [
    { key: 'setupEase', label: '설치/초기 설정 난이도', type: 'star' },   // 1~5 (쉬움일수록 높게)
    { key: 'performance', label: '성능(속도/처리능력)', type: 'star' },
    { key: 'battery', label: '배터리/전력 효율', type: 'star' },
    { key: 'heatNoise', label: '발열/소음 수준', type: 'star' },          // 낮을수록 좋은데, 5가 매우 낮음 기준으로 입력 가정
  ],
  '화장품': [
    { key: 'texture', label: '촉감/발림성', type: 'star' },
    { key: 'scent', label: '향', type: 'star' },
    { key: 'lasting', label: '지속력', type: 'star' },
    // 자극/재구매 의향 등 비별점 문항은 차트에서 제외(텍스트/분포는 추후 확장)
  ],
  '무형자산(플랫폼)': [
    { key: 'usability', label: '가입/사용성 편의', type: 'star' },
    { key: 'stability', label: '속도/안정성', type: 'star' },
    { key: 'featureFit', label: '기능 합성(니즈 충족)', type: 'star' },
    // 오류/버그 빈도(서술형/범주), 고객지원 품질(별점) -> 별점만 포함
    { key: 'support', label: '고객지원/가이드 품질', type: 'star' },
  ],
  '밀키트': [
    { key: 'taste', label: '맛', type: 'star' },
    { key: 'freshness', label: '신선도/재료 품질', type: 'star' },
    { key: 'cookGuide', label: '조리 시간·난이도 안내 정확성', type: 'star' },
    { key: 'packaging', label: '포장 상태', type: 'star' },
  ],
};

// 화면 드롭다운용 카테고리 목록
export const FEEDBACK_CATEGORIES = Object.keys(SURVEY_BY_CATEGORY);
