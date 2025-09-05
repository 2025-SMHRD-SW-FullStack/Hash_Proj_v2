const sellerNav = [
  { label: '메인', to: '/seller' },
  { label: '주문 관리', to: '/seller/orders' },
  { label: '교환 관리', to: '/seller/exchanges/pending' },

  // ▼ 그룹 (토글)
  {
    label: '상품 피드백',
    to: '/seller/feedbacks',       // 그룹 루트 (실제 라우팅은 자식으로 이동)
    type: 'group',
    children: [
      { label: '피드백 통계', to: '/seller/feedbacks/stats' },
      { label: '피드백 관리', to: '/seller/feedbacks/manage' },
    ],
  },

  { label: '상품 관리', to: '/seller/products' },
  { label: '정산 관리', to: '/seller/payouts' },
  
  // 광고 관리 그룹
  {
    label: '광고 관리',
    to: '/seller/ads',
    type: 'group',
    children: [
      { label: '파워 광고 신청', to: '/seller/ads/power' },
      { label: '광고 현황', to: '/seller/ads/management' },
    ],
  },
];

export default sellerNav;
