import { CHATS } from '/src/data/chats.mock'

// 나중에 axios 교체 예정
export const fetchSellerChats = async () => {
  // 최신 메시지 시간 기준 정렬
  return [...CHATS].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export const fetchChatById = async (id) => {
  return CHATS.find((c) => c.id === Number(id)) || null
}

export const sendMessageMock = async (chatId, text) => {
  const chat = CHATS.find((c) => c.id === Number(chatId))
  if (!chat) return null
  const msg = {
    id: 'm' + (chat.messages.length + 1),
    sender: 'seller',
    text,
    at: new Date().toISOString(),
  }
  chat.messages.push(msg)
  chat.lastMessage = text
  chat.updatedAt = msg.at
  return msg
}
