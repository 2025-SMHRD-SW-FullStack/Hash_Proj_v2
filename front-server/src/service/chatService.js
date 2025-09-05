import api from '../config/axiosInstance'

// 채팅방 목록 (as: 'user' | 'seller')
export const listRooms = (as = 'user') =>
  api.get('/api/chat/rooms', { params: { as } }).then(r => r.data)

// 채팅 메시지 목록 (roomId 가드)
export async function listMessages(roomId, arg2, arg3) {
  // 지원 형태:
  // 1) listMessages(roomId, { size, before })
  // 2) listMessages(roomId, before, size)
  // 3) listMessages(roomId, null)
  let opts = {};

  if (arg2 && typeof arg2 === 'object' && !Array.isArray(arg2)) {
    opts = arg2;
  } else if (arg2 != null && (typeof arg2 === 'number' || typeof arg2 === 'string')) {
    opts = { before: arg2, size: arg3 };
  } // else: null/undefined → 빈 옵션

  const { size = 50, before } = opts || {};
  const params = {};
  if (size != null) params.size = size;
  if (before != null) params.before = before;

  const res = await api.get(`/api/chat/rooms/${roomId}/messages`, {
    params,
    validateStatus: () => true,
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`listMessages ${res.status}`);
  }
  return res.data || [];
}

// 읽음 처리 (roomId 가드)
export const markRead = (roomId, lastReadMessageId) => {
  const rid = Number(roomId)
  if (!Number.isFinite(rid) || rid <= 0) return Promise.resolve()
  return api.post(`/api/chat/rooms/${rid}/read`, { lastReadMessageId })
}

// (유저↔셀러) 방 찾기/생성
export const findOrCreateUserSellerRoom = (sellerId) =>
  api.post('/api/chat/rooms/user-seller', { sellerId }).then(r => r.data)

// 상품ID로 셀러 매핑 후 방 찾기/생성
export const findOrCreateRoomByProduct = (productId) =>
  api.post(`/api/chat/rooms/by-product/${productId}`).then(r => r.data)
