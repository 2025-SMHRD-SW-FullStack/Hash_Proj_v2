import api from '../config/axiosInstance'

// 채팅방 목록 (as: 'user' | 'seller')
export const listRooms = (as = 'user') =>
  api.get('/api/chat/rooms', { params: { as } }).then(r => r.data)

// 채팅 메시지 목록 (roomId 가드)
export const listMessages = (roomId, before, size = 50) => {
  const rid = Number(roomId)
  if (!Number.isFinite(rid) || rid <= 0) return Promise.resolve([])
  return api
    .get(`/api/chat/rooms/${rid}/messages`, { params: { before, size } })
    .then(r => r.data)
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
