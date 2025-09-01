import { create } from 'zustand'

const useChatStore = create((set, get) => ({
  rooms: [],
  messages: {}, // { [roomId]: Message[] }

  setRooms: (rooms) => set({ rooms }),

  appendMessage: (roomId, msg) => {
    const me = get().me
    const m = get().messages[roomId] || []
    const enriched = { ...msg, isMine: me?.id && msg.senderId === me.id }
    set({ messages: { ...get().messages, [roomId]: [...m, enriched] } })
  },

  prependMessages: (roomId, older) => {
    const me = get().me
    const m = get().messages[roomId] || []
    const enriched = older.map(msg => ({ ...msg, isMine: me?.id && msg.senderId === me.id }))
    set({ messages: { ...get().messages, [roomId]: [...enriched, ...m] } })
  },

  me: null,
  setMe: (me) => set({ me }),
}))

export default useChatStore
