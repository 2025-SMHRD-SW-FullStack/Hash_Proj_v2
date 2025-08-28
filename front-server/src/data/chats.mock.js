// 간단 목업 (주문별 1:1 가정)
export const CHATS = [
  {
    id: 1,
    userName: '최고객',
    avatar: '/src/assets/images/ReSsol_TestImg.png',
    lastMessage: '배송은 언제쯤 될까요?',
    unread: 2,
    updatedAt: '2025-08-28T10:00:00',
    orderId: 'O-20250828-0001',
    messages: [
      { id: 'm1', sender: 'buyer', text: '안녕하세요! 주문했어요.', at: '2025-08-28T09:20:00' },
      { id: 'm2', sender: 'seller', text: '네! 오늘 발송 예정입니다.', at: '2025-08-28T09:22:00' },
      { id: 'm3', sender: 'buyer', text: '배송은 언제쯤 될까요?', at: '2025-08-28T10:00:00' },
    ],
  },
  {
    id: 2,
    userName: '박사장',
    avatar: '/src/assets/images/ReSsol_TestImg.png',
    lastMessage: '교환 가능한가요?',
    unread: 0,
    updatedAt: '2025-08-27T14:03:00',
    orderId: 'O-20250827-0003',
    messages: [
      { id: 'm1', sender: 'buyer', text: '교환 가능한가요?', at: '2025-08-27T14:03:00' },
    ],
  },
];
